// Living camp: the lineup pets wander, nap, train and greet each other, and the painted scene
// breathes (leaves, light shafts, butterflies, fireflies, crystal glints, forge sparks, cloud shadows, time of day).
import {Node,UITransform,Graphics,Color,UIOpacity,tween,sp,Vec3,SpriteFrame} from 'cc';
import {CampPaint} from './CampPaint';
import {PaperUI} from './PaperUI';
import {PetAppearance} from './PetAppearance';
import {FOX_PROFILE,PET_LOOK} from './PetProfile';
import {FOX_RIG} from './ActiveRig';

type Pt=[number,number];
// camp ground (design px, top-left origin) — walkable region in front of the crystal ring
const GROUND={x0:118,x1:424,y0:392,y1:552};
const CRYSTAL:Pt=[263,330];               // crystal base is a blocked ellipse
const POIS:{id:string;at:Pt;face:number;act:'train'|'look'|'work'|'rest'|'pray'}[]=[
 {id:'dummy',at:[392,408],face:1,act:'train'},
 {id:'egg',at:[168,352],face:-1,act:'look'},
 {id:'forge',at:[414,512],face:1,act:'work'},{id:'crystal',at:[263,408],face:1,act:'pray'},
 {id:'rest',at:[196,520],face:-1,act:'rest'}];
const LINES:Record<string,string[]>={
 fox:['今天也要守住核心！','我的焰刃又变强了','带上我去冒险吧！','吃饱了，随时出发~'],
 dog:['汪！我来保护大家！','木剑也能打赢！','要摸摸头吗？'],
 cat:['喵~给嫩芽浇点水吧','我的芽又长高了！'],
 penguin:['来打雪仗吗？','围巾暖暖的~'],
 bunny:['月亮今天好圆呀','挥挥魔杖，变！'],
 deer:['叮铃叮铃~','铃铛响，敌人慌！'],
 sparrow:['啾啾！瞄准中','弹弓练了一整天！'],
 chick:['呼——小心烫！','我的火苗更旺了！'],
 turtle:['慢慢来……不着急……','壳很硬，放心。'],
 mossdragon:['我身上长花啦','嗷呜~我是小龙！']};
const rnd=(a:number,b:number)=>a+Math.random()*(b-a);
const pick=<T>(l:T[])=>l[Math.floor(Math.random()*l.length)];
const col=(r:number,g:number,b:number,a=255)=>new Color(r,g,b,a);
const star4=(g:Graphics,x:number,y:number,r:number)=>{g.moveTo(x,y-r);g.lineTo(x+r*.28,y-r*.28);g.lineTo(x+r,y);g.lineTo(x+r*.28,y+r*.28);g.lineTo(x,y+r);g.lineTo(x-r*.28,y+r*.28);g.lineTo(x-r,y);g.lineTo(x-r*.28,y-r*.28);g.close();g.fill();};
const nodePos=(x:number,y:number):[number,number]=>[x-270,480-y];

interface Pal{look:PetAppearance;dir:string;moving:boolean;kind:string;node:Node;skel:sp.Skeleton;hit:Node;x:number;y:number;facing:number;target:Pt|null;state:string;t:number;wait:number;poi:string|null;partner:Pal|null;zT:number;base:number;ready:boolean;fade:number}
interface Mote{x:number;y:number;vx:number;vy:number;p:number;r:number}
interface Leaf{x:number;y:number;rot:number;vr:number;p:number;c:Color;s:number;t:number;life:number}
interface Fly{p:number;ax:number;ay:number;cx:number;cy:number;sp:number;c:Color}
interface Spark{x:number;y:number;vx:number;vy:number;t:number;life:number;c:Color;r:number}

export interface CampServices{ui:PaperUI;parent:Node;rigs:Record<string,sp.SkeletonData>;crystal:Node|null;glow:Node|null;tap:(n:Node,fn:()=>void)=>void;say:(s:string)=>void;getDeck:()=>string[];camp?:SpriteFrame|null;campNode?:Node|null}

export class CampLife{
 private S:CampServices;private pets=new Map<string,Pal>();private time=0;private sync=0;private pal:Node;private hits:Node;private fxTop:Node;private bubble:Node|null=null;
 private paint:CampPaint|null=null;private gShadow!:Graphics;private gFx!:Graphics;private gTint!:Graphics;private gGlow!:Graphics;
 private motes:Mote[]=[];private leaves:Leaf[]=[];private flies:Fly[]=[];private butter:Fly[]=[];private sparks:Spark[]=[];private tufts:{x:number;y:number;s:number;p:number}[]=[];
 private leafT=0;private forgeT=2;private eggT=3;private shimmerT=4;private clouds=[{x:-80,y:300,s:1},{x:300,y:480,s:1.3}];
 private override=-1;private crystalPulse=0;private bursts:{x:number;y:number;t:number}[]=[];
 constructor(s:CampServices){this.S=s;const ui=s.ui,p=s.parent;
  // back effects sit under the pets; pets container also sorts the crystal
  if(s.camp)this.paint=new CampPaint(ui,p,s.campNode||null,s.camp);
  this.gShadow=ui.node(p,'CampShadow',270,480,540,960).addComponent(Graphics);
  this.pal=ui.node(p,'CampPets',270,480,540,960);
  if(s.glow)this.pal.addChild(s.glow);if(s.crystal)this.pal.addChild(s.crystal);
  this.gFx=ui.node(p,'CampFx',270,480,540,960).addComponent(Graphics);
  this.gGlow=ui.node(p,'CampGlow',270,480,540,960).addComponent(Graphics);
  this.fxTop=ui.node(p,'CampText',270,480,540,960);
  this.gTint=ui.node(p,'CampTint',270,480,540,960).addComponent(Graphics);
  this.hits=ui.node(p,'CampHits',270,480,540,960);
 }
 // ------------------------------------------------------------------ time of day
 hour(){if(this.override>=0)return [12,18,23.5][this.override];const d=new Date();return d.getHours()+d.getMinutes()/60;}
 cycleTime(){this.override=this.override>=2?-1:this.override+1;const names=['白天','黄昏','夜晚'];this.S.say(this.override<0?'昼夜：跟随现实时间':`昼夜：${names[this.override]}`);}
 private daylight(h:number){return h<5.5||h>20?0:h<7?(h-5.5)/1.5:h>18.5?(20-h)/1.5:1;}
 private tint(h:number):[number,number,number,number]{ // r,g,b,alpha of the overlay
  if(h>=9&&h<16)return [255,244,214,0];if(h>=6&&h<9)return [255,200,140,34];if(h>=16&&h<19)return [255,140,70,46];if(h>=19&&h<21)return [90,70,130,78];return [18,28,86,92];}
 // ------------------------------------------------------------------ pets
 private makePal(kind:string):Pal|null{
  const data=kind==='fox'?this.S.rigs.fox:this.S.rigs[kind];if(!data)return null;
  const node=new Node('Pal:'+kind);node.layer=this.pal.layer;this.pal.addChild(node);node.addComponent(UITransform).setContentSize(90,100);
  const skel=node.addComponent(sp.Skeleton);skel.premultipliedAlpha=false;skel.skeletonData=data;
  const look=new PetAppearance(skel,{...FOX_PROFILE.appearance,scarf:PET_LOOK[kind]?.scarf??0});look.apply(false);
  if(kind!=='fox')for(const n of ['scarf','scarf-tail']){const sl=skel.findSlot(n) as any;if(sl){sl.color.r=1;sl.color.g=1;sl.color.b=1;}}
  skel.setAnimation(0,'idle',true);skel.setAnimation(1,'face-calm',true);skel.setAnimation(2,'look-center',true);
  for(const a of ['idle','walk','happy','sniff','attack','sleep','wake'])for(const b of ['idle','walk','happy','sniff','attack','sleep','wake'])if(a!==b)skel.setMix(a,b,.12);
  const [x,y]=this.freeSpot(null);const hit=this.S.ui.node(this.hits,'PalHit',x,y-45,70,92);
  const pal:Pal={look,dir:'side',moving:false,kind,node,skel,hit,x,y,facing:Math.random()<.5?1:-1,target:null,state:'idle',t:0,wait:rnd(.5,3),poi:null,partner:null,zT:0,base:(PET_LOOK[kind]?.scale??.19)/.19*.2,ready:true,fade:0};
  this.S.tap(hit,()=>this.petTap(pal));
  const op=node.addComponent(UIOpacity);op.opacity=0;tween(op).to(.5,{opacity:255}).start();
  return pal;}
 private blocked(x:number,y:number){const dx=(x-CRYSTAL[0])/92,dy=(y-(CRYSTAL[1]+52))/40;return dx*dx+dy*dy<1;}
 private freeSpot(self:Pal|null):Pt{for(let i=0;i<40;i++){const x=rnd(GROUND.x0,GROUND.x1),y=rnd(GROUND.y0,GROUND.y1);if(this.blocked(x,y))continue;let ok=true;for(const p of this.pets.values()){if(p===self)continue;const q=p.target||[p.x,p.y];if(Math.hypot(q[0]-x,(q[1]-y)*1.4)<54)ok=false;}if(ok)return [x,y];}return [rnd(GROUND.x0,GROUND.x1),GROUND.y1-10];}
 private anim(p:Pal,name:string,loop:boolean,ts=1){const e=p.skel.setAnimation(0,name,loop);if(e)e.timeScale=ts;return e;}
 private face(p:Pal,f:string){p.skel.setAnimation(1,f,true);}
 private stepScale(p:Pal){return p.base*(.88+Math.max(0,Math.min(1,(p.y-GROUND.y0)/(GROUND.y1-GROUND.y0)))*.26);}
 private walkTo(p:Pal,t:Pt,state='walk'){p.target=t;p.state=state;p.moving=true;const dx=t[0]-p.x,dy=t[1]-p.y;p.dir=Math.abs(dy)>Math.abs(dx)*1.25?(dy<0?'up':'down'):'side';
  const s=this.stepScale(p),name=p.dir==='up'?'walk-back':p.dir==='down'?'walk-front':'walk',e=this.anim(p,name,true);p.look.apply(p.dir==='up');
  if(e)e.timeScale=38*(s/.2)/(FOX_RIG.stride/FOX_RIG.worldUnitsPerSpineUnit*.2/FOX_RIG.walkDuration)*.95;this.face(p,'face-calm');}
 private decide(p:Pal){
  const r=Math.random(),n=this.pets.size;
  if(r<.42){const t=this.freeSpot(p);this.walkTo(p,t);}
  else if(r<.58){p.state='sniff';p.t=1.2;this.anim(p,'sniff',false);}
  else if(r<.80){const poi=pick(POIS),taken=Array.from(this.pets.values()).some(q=>q!==p&&q.poi===poi.id);if(taken){this.walkTo(p,this.freeSpot(p));return;}p.poi=poi.id;this.walkTo(p,[poi.at[0],poi.at[1]],'toPoi');}
  else if(r<.9&&n>1){const q=pick(Array.from(this.pets.values()).filter(o=>o!==p&&o.state==='idle'));if(q){p.partner=q;q.partner=p;const mid:Pt=[(p.x+q.x)/2,(p.y+q.y)/2];this.walkTo(p,[mid[0]-(p.x<q.x?26:-26),mid[1]],'toGreet');q.state='waitGreet';q.t=6;this.anim(q,'idle',true);}else p.wait=1;}
  else{p.state='sniff';p.t=1.2;this.anim(p,'sniff',false);}
  if(p.state==='sniff'||p.state==='idle')p.wait=rnd(1.2,3.6);}
 private arrive(p:Pal){
  p.target=null;p.moving=false;p.look.apply(false);if(p.dir!=='side'){p.dir='side';}
  if(p.state==='toGreet'&&p.partner){const q=p.partner;p.facing=q.x>p.x?1:-1;q.facing=-p.facing;p.state=q.state='greet';p.t=q.t=1.3;this.anim(p,'happy',false);this.anim(q,'happy',false);this.face(p,'face-happy');this.face(q,'face-happy');this.heart(p.x,p.y-88);this.heart(q.x,q.y-88);return;}
  if(p.state==='toPoi'){const poi=POIS.find(o=>o.id===p.poi)!;p.facing=poi.face;
   if(poi.act==='train'){p.state='train';p.t=4.4;this.anim(p,'attack',true,.9);this.face(p,'face-focus');}
   else if(poi.act==='look'){p.state='look';p.t=3;this.anim(p,'sniff',false);this.face(p,'face-happy');this.paint?.eggWiggle();}
   else if(poi.act==='work'){p.state='work';p.t=4.6;this.anim(p,'attack',true,.8);this.face(p,'face-focus');}
   else if(poi.act==='pray'){p.state='pray';p.t=3.6;this.anim(p,'idle',true);this.face(p,'face-happy');}
   else{p.state='sleep';p.t=rnd(7,11);this.anim(p,'sleep',true);this.face(p,'face-sleep');p.zT=0;}
   return;}
  p.state='idle';this.anim(p,'stop',false);p.skel.addAnimation(0,'idle',true,0);p.wait=rnd(1.5,4);}
 private endState(p:Pal){
  if(p.state==='sleep'){this.anim(p,'wake',false);p.state='wake';p.t=.9;return;}
  p.poi=null;if(p.partner){p.partner.partner=null;p.partner.state='idle';p.partner.wait=rnd(1,2.5);this.anim(p.partner,'idle',true);this.face(p.partner,'face-calm');p.partner=null;}
  p.state='idle';this.anim(p,'idle',true);this.face(p,'face-calm');p.wait=rnd(1.5,4);}
 private petTap(p:Pal){
  if(p.state==='sleep'){this.endState(p);}
  p.target=null;p.partner=null;p.state='happy';p.t=1.3;this.anim(p,'happy',false);this.face(p,'face-happy');this.heart(p.x,p.y-90);this.speak(p,pick(LINES[p.kind]||LINES.fox));}
 private speak(p:Pal,s:string){if(this.bubble?.isValid)this.bubble.destroy();const w=Math.max(120,s.length*17+30),ui=this.S.ui,b=ui.frame(this.fxTop,'Bubble',p.x,p.y-122,w,40,'card');
  ui.label(b,s,w/2,19,w-20,28,15,true);const op=b.addComponent(UIOpacity);this.bubble=b;(b as any).__pal=p;tween(op).delay(1.8).to(.3,{opacity:0}).call(()=>b.destroy()).start();}
 private heart(x:number,y:number){this.bursts.push({x,y,t:0});}
 // ------------------------------------------------------------------ effects
 private spawnLeaf(initial=false){const pal=[col(120,170,60),col(150,196,70),col(196,170,60),col(214,140,50),col(96,150,70)];
  this.leaves.push({x:rnd(60,480),y:initial?rnd(120,480):rnd(96,150),rot:rnd(0,6.28),vr:rnd(-2,2),p:rnd(0,6.28),c:pick(pal),s:rnd(.8,1.5),t:0,life:rnd(7,11)});}
 private emitSparks(x:number,y:number,n:number,c:Color){for(let i=0;i<n;i++)this.sparks.push({x,y,vx:rnd(-30,30),vy:rnd(-90,-30),t:0,life:rnd(.5,1.1),c,r:rnd(1.2,2.4)});}
 // ------------------------------------------------------------------ update
 update(dt:number){
  this.time+=dt;this.sync-=dt;if(this.sync<=0){this.sync=1;this.syncDeck();}
  this.updatePets(dt);this.drawShadows();this.paint?.update(dt);this.drawFx(dt);this.drawTint();}
 private syncDeck(){const deck=this.S.getDeck().filter(k=>this.S.rigs[k]||k==='fox').slice(0,6);
  for(const k of deck)if(!this.pets.has(k)){const p=this.makePal(k);if(p)this.pets.set(k,p);}
  for(const [k,p] of this.pets)if(!deck.includes(k)){p.node.destroy();p.hit.destroy();this.pets.delete(k);}}
 private updatePets(dt:number){
  const list=Array.from(this.pets.values());
  for(const p of list){
   if(p.state==='idle'||p.state==='sniff'){if(p.state==='sniff'){p.t-=dt;if(p.t<=0){p.state='idle';this.anim(p,'idle',true);}}p.wait-=dt;if(p.wait<=0&&p.state==='idle')this.decide(p);}
   else if(p.target){const [tx,ty]=p.target,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),sp0=38*(this.stepScale(p)/.2)*dt;
    if(d<=sp0){p.x=tx;p.y=ty;this.arrive(p);}else{p.x+=dx/d*sp0;p.y+=dy/d*sp0;this.paint?.touch(p.x,p.y,dx);if(Math.abs(dx)>1)p.facing=dx<0?-1:1;}}
   else{p.t-=dt;
    if(p.state==='train'){if(Math.floor(p.t*2.4)!==Math.floor((p.t+dt)*2.4)&&Math.random()<.9){this.emitSparks(p.x+34*p.facing,p.y-44,4,col(255,230,140));this.paint?.hitTarget();}}
    if(p.state==='work'&&Math.floor(p.t*1.9)!==Math.floor((p.t+dt)*1.9)){this.emitSparks(468+rnd(-6,6),494,5,col(255,170,70));this.paint?.anvilHit();}
    if(p.state==='pray'&&Math.floor(p.t*.8)!==Math.floor((p.t+dt)*.8)){this.crystalPulse=Math.max(this.crystalPulse,.9);}
    if(p.state==='look'&&Math.random()<dt*.8)this.paint?.eggWiggle();
    if(p.state==='sleep'){p.zT-=dt;if(p.zT<=0){p.zT=1.2;this.zzz(p);}}
    if(p.state==='waitGreet'&&p.partner===null&&p.t<=0){p.state='idle';}
    if(p.t<=0&&p.state!=='idle'&&p.state!=='waitGreet')this.endState(p);
    if(p.state==='wake'&&p.t<=0){p.state='idle';p.poi=null;this.anim(p,'idle',true);this.face(p,'face-calm');p.wait=rnd(1.5,3);}}
   const s=this.stepScale(p);const [nx,ny]=nodePos(p.x,p.y);p.node.setPosition(nx,ny,0);p.node.setScale(s*p.facing,s,1);p.hit.setPosition(nx,ny+45,0);}
  // depth order (the crystal sorts like a pet standing at its base)
  const items:{n:Node;y:number}[]=list.map(p=>({n:p.node,y:p.y}));
  if(this.S.glow?.parent===this.pal)items.push({n:this.S.glow,y:344});if(this.S.crystal?.parent===this.pal)items.push({n:this.S.crystal,y:345});
  items.sort((a,b)=>a.y-b.y).forEach((o,i)=>o.n.setSiblingIndex(i));
  if(this.bubble?.isValid){const p=(this.bubble as any).__pal as Pal;if(p)this.bubble.setPosition(p.x-270,480-(p.y-122),0);}}
 private zzz(p:Pal){const n=this.S.ui.label(this.fxTop,'Z',p.x+16,p.y-70,24,24,18,true,col(240,248,255)).node;const op=n.addComponent(UIOpacity);tween(n).by(1.6,{position:new Vec3(10,34,0)}).start();tween(op).delay(.9).to(.7,{opacity:0}).call(()=>n.destroy()).start();}
 private drawShadows(){const g=this.gShadow;g.clear();const day=this.daylight(this.hour());for(const p of this.pets.values()){const s=this.stepScale(p),w=(p.state==='sleep'?30:24)*s/.2,[px,py]=nodePos(p.x,p.y+2);g.fillColor=col(40,28,18,Math.round(62*(.55+.45*day)));g.ellipse(px,py,w,w*.32);g.fill();}}
 private drawFx(dt:number){const g=this.gFx,gg=this.gGlow;g.clear();gg.clear();const h=this.hour(),day=this.daylight(h),night=1-day;
  const wind=Math.sin(this.time*.3)*18+Math.sin(this.time*.77)*8;
  // crystal: halo, orbiting glints, sweeping shimmer, tap ripple
  const cx=263-270,cy=480-300,k=.5+.5*Math.sin(this.time*2.2),boost=1+night*.9+this.crystalPulse;
  gg.fillColor=col(110,230,236,Math.round(22*boost));gg.circle(cx,cy+6,70+8*k);gg.fill();gg.fillColor=col(150,245,250,Math.round(26*boost));gg.circle(cx,cy+6,44+5*k);gg.fill();
  this.shimmerT-=dt;if(this.shimmerT<=0){this.shimmerT=rnd(3.5,6);this.crystalPulse=Math.max(this.crystalPulse,.5);}this.crystalPulse=Math.max(0,this.crystalPulse-dt*.7);
  // hatchery egg: warm glow + sparkle
  const ex=135-270,ey=480-268,ek=.5+.5*Math.sin(this.time*1.7);gg.fillColor=col(255,214,120,Math.round(26+20*ek));gg.circle(ex,ey,26+3*ek);gg.fill();
  // sparks
  for(let i=this.sparks.length-1;i>=0;i--){const s=this.sparks[i];s.t+=dt;if(s.t>s.life){this.sparks.splice(i,1);continue;}s.vy+=70*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;const a=1-s.t/s.life,[px,py]=nodePos(s.x,s.y);gg.fillColor=new Color(s.c.r,s.c.g,s.c.b,Math.round(230*a));gg.circle(px,py,s.r);gg.fill();}
  // heart bursts when pets are tapped or greet
  for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.t+=dt;if(b.t>1.1){this.bursts.splice(i,1);continue;}const a=1-b.t/1.1;for(let j=0;j<3;j++){const x=b.x+(j-1)*14+Math.sin(b.t*5+j)*3,y=b.y-b.t*34-j*5,[px,py]=nodePos(x,y),r=5.5*(1-j*.15);
    g.fillColor=col(255,106,128,Math.round(235*a));g.strokeColor=col(42,26,18,Math.round(230*a));g.lineWidth=1.4;g.circle(px-r*.5,py+r*.2,r*.62);g.fill();g.circle(px+r*.5,py+r*.2,r*.62);g.fill();g.moveTo(px-r*1.05,py+r*.05);g.lineTo(px,py-r*1.3);g.lineTo(px+r*1.05,py+r*.05);g.close();g.fill();}}
 }
 private drawTint(){const g=this.gTint;g.clear();const [r,gr,b,a]=this.tint(this.hour());if(a>0){g.fillColor=col(r,gr,b,a);g.rect(-270,-480+390,540,550);g.fill();}}
 crystalTap(){this.crystalPulse=1.2;this.emitSparks(263,300,18,col(150,245,250));this.cycleTime();}
 trainCollect(){this.paint?.hitTarget();this.emitSparks(452,300,16,col(255,214,90));}
 hatchTap(){this.emitSparks(135,268,12,col(255,240,170));}
}
