// 冒险地图：整页地图 + 章节切换 + 关卡节点（星级/锁/首领）+ 本关掉落与敌人信息。
import {Node,Color,Graphics,Sprite,UITransform} from 'cc';
import {C} from './PaperUI';
import {STAGES,CHAPTERS,MONSTERS,bossOf,stageName,PER_CHAPTER} from './battle/BattleConfig';
import type {MonsterKind} from './battle/BattleConfig';
import {STAMINA} from './meta/PlayerModel';
import {MATS,MAT_COLOR,CHAPTER_DROPS,gemDef,gemKey} from './meta/Gear';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import {col,mix,deep,LEFT} from './uiutil';

const MAP={x:15,y:150,w:510,h:430};
// node centres inside the map box (bottom-left start, winding up to the boss)
const NODES:[number,number][]=[[60,380],[160,340],[270,372],[388,330],[440,240],[330,200],[190,180],[300,80]];
const THEME=[
 {paper:[236,226,190],road:[206,184,132],name:'森林'},{paper:[214,230,226],road:[196,200,168],name:'水岸'},
 {paper:[238,214,190],road:[204,170,130],name:'峡谷'},{paper:[226,224,236],road:[190,186,170],name:'高原'},
 {paper:[214,222,196],road:[170,170,130],name:'沼泽'},{paper:[232,240,248],road:[200,210,222],name:'雪原'},
 {paper:[218,210,226],road:[170,160,176],name:'古堡'},{paper:[214,212,236],road:[196,186,150],name:'星辰'}];
export const stageRec=(i:number)=>Math.round(3000+(STAGES[i]?.diff??i)*900);

export class AdventureUI{
 private k:Kit;private chapter=-1;private marker:Node|null=null;private t=0;
 constructor(private h:GearHost){this.k=new Kit(h);}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}
 open(){const m=this.m;this.chapter=STAGES[m.stage].chapter-1;this.render();}
 private render(){this.h.page(p=>this.build(p));}

 private path(c:number){const flip=c%2===1;const pts=NODES.map(([x,y])=>[flip?MAP.w-x:x,y] as [number,number]);const out:[number,number][]=[];
  const P=[pts[0],...pts,pts[pts.length-1]];for(let i=1;i<P.length-2;i++)for(let s=0;s<20;s++){const t=s/20,t2=t*t,t3=t2*t;const f=(a:number,b:number,cc:number,d:number)=>.5*((2*b)+(-a+cc)*t+(2*a-5*b+4*cc-d)*t2+(-a+3*b-3*cc+d)*t3);
   out.push([f(P[i-1][0],P[i][0],P[i+1][0],P[i+2][0]),f(P[i-1][1],P[i][1],P[i+1][1],P[i+2][1])]);}out.push(pts[pts.length-1]);return {pts,out};}

 private doodles(g:Graphics,c:number,out:[number,number][],pts:[number,number][]){let seed=c*977+13;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const near=(x:number,y:number,r:number)=>out.some(([a,b])=>Math.hypot(a-x,b-y)<r)||pts.some(([a,b])=>Math.hypot(a-x,b-y)<r+22);
  const ink=new Color(60,50,36,200);g.lineWidth=2;
  const tree=(x:number,y:number,s:number)=>{g.fillColor=new Color(120,84,52,255);g.rect(x-2*s,y,4*s,9*s);g.fill();g.fillColor=new Color(96,150,84,255);g.strokeColor=ink;g.circle(x,y-4*s,11*s);g.fill();g.stroke();g.fillColor=new Color(120,176,100,255);g.circle(x-4*s,y-8*s,6*s);g.fill();};
  const shroom=(x:number,y:number,s:number)=>{g.fillColor=new Color(250,244,230,255);g.rect(x-2*s,y,4*s,6*s);g.fill();g.fillColor=new Color(220,80,70,255);g.strokeColor=ink;g.ellipse(x,y,8*s,5*s);g.fill();g.stroke();};
  const wave=(x:number,y:number,s:number)=>{g.strokeColor=new Color(90,150,190,230);g.lineWidth=2.4;for(let i=0;i<2;i++){g.moveTo(x-12*s,y+i*6*s);g.quadraticCurveTo(x-6*s,y-5*s+i*6*s,x,y+i*6*s);g.quadraticCurveTo(x+6*s,y+5*s+i*6*s,x+12*s,y+i*6*s);}g.stroke();g.lineWidth=2;};
  const lily=(x:number,y:number,s:number)=>{g.fillColor=new Color(110,176,120,255);g.strokeColor=ink;g.ellipse(x,y,11*s,6*s);g.fill();g.stroke();g.fillColor=new Color(250,170,190,255);g.circle(x+2*s,y-3*s,3*s);g.fill();};
  const mesa=(x:number,y:number,s:number)=>{g.fillColor=new Color(196,118,84,255);g.strokeColor=ink;g.moveTo(x-16*s,y+10*s);g.lineTo(x-11*s,y-12*s);g.lineTo(x+11*s,y-12*s);g.lineTo(x+17*s,y+10*s);g.close();g.fill();g.stroke();g.strokeColor=new Color(150,80,56,200);g.moveTo(x-13*s,y-2*s);g.lineTo(x+14*s,y-2*s);g.moveTo(x-15*s,y+5*s);g.lineTo(x+16*s,y+5*s);g.stroke();g.strokeColor=ink;};
  const rock=(x:number,y:number,s:number)=>{g.fillColor=new Color(160,150,140,255);g.strokeColor=ink;g.moveTo(x-9*s,y+5*s);g.lineTo(x-5*s,y-6*s);g.lineTo(x+6*s,y-5*s);g.lineTo(x+10*s,y+5*s);g.close();g.fill();g.stroke();};
  const bolt=(x:number,y:number,s:number)=>{g.fillColor=new Color(252,214,70,255);g.strokeColor=ink;g.moveTo(x+3*s,y-14*s);g.lineTo(x-7*s,y+1*s);g.lineTo(x-1*s,y+1*s);g.lineTo(x-4*s,y+14*s);g.lineTo(x+8*s,y-4*s);g.lineTo(x+2*s,y-4*s);g.close();g.fill();g.stroke();};
  const cloud=(x:number,y:number,s:number)=>{g.fillColor=new Color(250,250,252,255);g.strokeColor=new Color(150,150,170,255);for(const [dx,dy,r] of [[-9,2,7],[0,-3,9],[9,2,7]]){g.circle(x+dx*s,y+dy*s,r*s);}g.fill();g.stroke();};
  const flake=(x:number,y:number,s:number)=>{g.strokeColor=new Color(120,170,220,255);g.lineWidth=2.2;for(let i=0;i<3;i++){const a=i*Math.PI/3;g.moveTo(x-Math.cos(a)*9*s,y-Math.sin(a)*9*s);g.lineTo(x+Math.cos(a)*9*s,y+Math.sin(a)*9*s);}g.stroke();g.lineWidth=2;};
  const pine=(x:number,y:number,s:number)=>{g.fillColor=new Color(110,150,130,255);g.strokeColor=ink;g.moveTo(x,y-16*s);g.lineTo(x+9*s,y+4*s);g.lineTo(x-9*s,y+4*s);g.close();g.fill();g.stroke();g.fillColor=new Color(250,252,255,255);g.moveTo(x,y-16*s);g.lineTo(x+4*s,y-7*s);g.lineTo(x-4*s,y-7*s);g.close();g.fill();};
  const tower=(x:number,y:number,s:number)=>{g.fillColor=new Color(150,140,160,255);g.strokeColor=ink;g.rect(x-6*s,y-12*s,12*s,22*s);g.fill();g.stroke();g.fillColor=new Color(110,90,130,255);g.moveTo(x-8*s,y-12*s);g.lineTo(x,y-22*s);g.lineTo(x+8*s,y-12*s);g.close();g.fill();g.stroke();g.fillColor=new Color(255,220,120,255);g.rect(x-2*s,y-6*s,4*s,5*s);g.fill();};
  const star=(x:number,y:number,s:number)=>{g.fillColor=new Color(255,220,110,255);g.strokeColor=ink;for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=(i%2?4:10)*s;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)g.lineTo(px,py);else g.moveTo(px,py);}g.close();g.fill();g.stroke();};
  const reed=(x:number,y:number,s:number)=>{g.strokeColor=new Color(100,130,80,255);g.lineWidth=2;for(let i=-1;i<=1;i++){g.moveTo(x+i*4*s,y+8*s);g.lineTo(x+i*6*s,y-10*s);}g.stroke();g.fillColor=new Color(140,100,70,255);g.ellipse(x,y-10*s,2.5*s,5*s);g.fill();};
  const set=[[tree,tree,shroom],[wave,lily,wave],[mesa,rock,mesa],[bolt,cloud,rock],[reed,lily,shroom],[pine,flake,rock],[tower,rock,bolt],[star,cloud,star]][c];
  for(let n=0;n<70;n++){const x=14+rnd()*(MAP.w-28),y=14+rnd()*(MAP.h-28),s=.8+rnd()*.7;if(near(x,y,34))continue;set[Math.floor(rnd()*set.length)](x,y,s);}}

 private build(p:Node){const m=this.m,k=this.k,ui=this.ui,c=Math.max(0,Math.min(CHAPTERS.length-1,this.chapter)),th=THEME[c];
  ui.rect(p,'Paper',270,480,540,960,col([240,231,208]),false);
  // ---- top bar
  ui.frame(p,'Top',270,52,532,92,'panel');ui.roundBtn(p,'adv-back',40,52,44,()=>this.h.close(),'round','back');
  const rib=ui.frame(p,'Title',270,50,260,56,'ribbon');this.h.bold(rib,'冒险地图',130,26,200,34,25,C.white,C.ink,3);
  const st=ui.frame(p,'Stamina',466,52,92,40,'pill');ui.icon(st,'energy',18,20,24);this.h.text(st,'',`${m.stamina}/${m.staminaMax}`,56,20,60,20,14,true);
  // ---- chapter tabs
  const half=c>=4?4:0,cw=(540-30-88)/4;ui.btn(p,'chprev','‹',36,122,40,38,()=>{this.chapter=Math.max(0,half-4);this.render();},half?'cream':'grey',22);ui.btn(p,'chnext','›',504,122,40,38,()=>{if(m.stageUnlocked(4*PER_CHAPTER)){this.chapter=4;this.render();}else this.h.say('先通关第 4 章',1.4);},half?'grey':'cream',22);
  CHAPTERS.slice(half,half+4).forEach((n,j)=>{const i=half+j;const open=m.stageUnlocked(i*PER_CHAPTER);const b=ui.btn(p,'ch'+i,n,59+cw*(j+.5),122,cw-6,38,()=>{if(!open){this.h.say('先通关上一章（每关至少 1 星）',1.6);return;}this.chapter=i;this.render();},i===c?'gold':open?'cream':'grey',15);});
  // ---- map
  const frame=ui.frame(p,'MapFrame',MAP.x+MAP.w/2,MAP.y+MAP.h/2+22,MAP.w+14,MAP.h+14,'panel');
  const map=ui.node(p,'Map',MAP.x+MAP.w/2,MAP.y+MAP.h/2+22,MAP.w,MAP.h);
  const art=this.h.art()['stages/ch'+(c+1)];if(art){const s=this.h.sprite(map,'stages/ch'+(c+1),MAP.w/2,MAP.h/2,MAP.w,MAP.h);const sp=s.getComponent(Sprite);if(sp)sp.color=new Color(255,255,255,255);}
  const wash=ui.node(map,'wash',MAP.w/2,MAP.h/2,MAP.w,MAP.h).addComponent(Graphics);wash.fillColor=new Color(th.paper[0],th.paper[1],th.paper[2],art?208:255);wash.rect(-MAP.w/2,-MAP.h/2,MAP.w,MAP.h);wash.fill();
  const {pts,out}=this.path(c);
  const ter=ui.node(map,'terrain',0,0,MAP.w,MAP.h).addComponent(Graphics);ter.node.setPosition(-MAP.w/2,-MAP.h/2,0);
  // graphics origin sits at the node's centre; flip y so doodles use top-left coordinates
  ter.node.setScale(1,-1,1);ter.node.setPosition(-MAP.w/2,MAP.h/2,0);this.doodles(ter,c,out,pts);
  const rd=ui.node(map,'road',0,0,MAP.w,MAP.h).addComponent(Graphics);rd.node.setScale(1,-1,1);rd.node.setPosition(-MAP.w/2,MAP.h/2,0);
  rd.strokeColor=new Color(th.road[0]-30,th.road[1]-30,th.road[2]-30,255);rd.lineWidth=22;rd.lineJoin=Graphics.LineJoin.ROUND;rd.lineCap=Graphics.LineCap.ROUND;rd.moveTo(out[0][0],out[0][1]);for(const q of out.slice(1))rd.lineTo(q[0],q[1]);rd.stroke();
  rd.strokeColor=col(th.road);rd.lineWidth=16;rd.moveTo(out[0][0],out[0][1]);for(const q of out.slice(1))rd.lineTo(q[0],q[1]);rd.stroke();
  rd.fillColor=new Color(255,250,230,230);for(let i=0;i<out.length;i+=3){rd.circle(out[i][0],out[i][1],2.1);rd.fill();}
  // ---- nodes
  const unlockedUpTo=pts.map((_,n)=>m.stageUnlocked(c*PER_CHAPTER+n));
  pts.forEach(([x,y],n)=>{const i=c*PER_CHAPTER+n,s=STAGES[i],open=unlockedUpTo[n],cur=i===m.stage,boss=s.boss,size=boss?70:s.elite?56:50;
   const node=ui.frame(map,'node'+i,x,y,size,size,cur?'btn-red':open?(boss?'btn-gold':'btn-cream'):'btn-grey');
   if(open)this.h.bold(node,boss?'王':s.name.split('-')[1],size/2,size/2-3,size-12,28,boss?26:22,cur?C.white:C.ink,cur?C.ink:C.white,2.5);else ui.icon(node,'lock',size/2,size/2-3,size*.46);
   if(open){for(let j=0;j<3;j++)ui.img(map,j<m.stageStars[i]?'star':'star-off',x+(j-1)*18,y+size/2+12,17);}
   if(boss)ui.icon(map,'trophy',x,y-size/2-10,26);else if(s.elite)ui.icon(map,'swords',x,y-size/2-8,22);
   this.h.tap(node,()=>{if(m.selectStage(i)){m.save();this.h.refresh();this.render();}else this.h.say('先通关上一关（至少 1 星）',1.6);});
   if(cur){const lead=m.deck[0],mk=this.h.sprite(map,'pet:'+lead,x,y-size/2-30,44,44);this.marker=mk;(mk as any).__y=y-size/2-30;}});
  // ---- info card
  const s=STAGES[m.stage],i=m.stage,top=612;
  const card=ui.frame(p,'Info',270,top+158,532,316,'panel');
  const thumb=ui.frame(card,'Thumb',78,66,120,74,'card');this.h.sprite(thumb,this.h.art()['stages/ch'+s.chapter]?'stages/ch'+s.chapter:'home/stage-thumb',60,37,108,62);
  this.k.lt(card,`${s.chapterName} · ${stageName(i)}`,150,18,370,26,19,true,C.ink);
  const stars=ui.node(card,'stars',0,0,1,1);for(let j=0;j<3;j++)ui.img(stars,j<m.stageStars[i]?'star':'star-off',160+j*22,60,20);
  const rec=stageRec(i),pow=m.teamPower,ok=pow>=rec,mid=pow>=rec*.8;
  this.k.lt(card,`推荐 ${rec.toLocaleString('en-US')}　我方 ${pow.toLocaleString('en-US')}`,232,51,290,18,13,true,C.muted);
  this.k.lt(card,ok?'战力充足':mid?'战力略低，建议升级装备':'战力偏低，容易失败',150,82,370,16,12,true,ok?col([46,150,70]):mid?col([220,140,30]):C.red);
  this.h.text(card,'',s.boss?'首领守卫：打碎两颗紫水晶，再击败首领':s.elite?'精英挑战：守军更多、角魔更频繁，奖励 ×1.3':'核心攻坚：依次打碎两颗紫水晶和敌方核心',266,112,484,18,13,true,C.ink);
  // enemies
  const foes:string[]=Array.from(new Set(s.specials)).slice(0,5).map(k=>`${MONSTERS[k].name}`);if(s.boss)foes.unshift(MONSTERS[bossOf(s.chapter)].name+'（首领）');
  this.h.text(card,'',`敌人：${foes.length?foes.join('、'):'毛球怪、蘑菇怪、角魔'}　强度 ×${s.hpScale.toFixed(1)}`,266,134,484,18,12,true,C.muted);
  // drops
  const t=CHAPTER_DROPS[s.chapter-1];this.k.lt(card,`掉落（${t.note}）`,20,162,300,18,13,true,C.ink);
  let dx=30;for(const l of t.mats.filter(x=>x.id!=='crystal')){const chip=ui.rect(card,'drop'+l.id,dx+58,196,112,34,mix(MAT_COLOR[l.id],.7),true);ui.rect(chip,'sw',16,17,16,16,col(MAT_COLOR[l.id]),true);this.h.text(chip,'',`${MATS.find(x=>x.id===l.id)!.name} ${l.min}-${l.max}`,70,17,90,18,13,true,C.ink);dx+=120;if(dx>440)break;}
  const cr=ui.rect(card,'dropcr',476,196,84,34,mix(MAT_COLOR.crystal,.7),true);ui.rect(cr,'sw',14,17,16,16,col(MAT_COLOR.crystal),true);this.h.text(cr,'',s.boss?'灵晶 ×2':'灵晶 概率',50,17,60,18,12,true,C.ink);
  this.k.lt(card,'宝石：',20,224,50,18,13,true,C.ink);t.gems.forEach((g,j)=>{const key=gemKey(g,1);this.k.gemIcon(card,92+j*96,225,13,key);this.k.lt(card,gemDef(g)!.name,110+j*96,224,60,16,12,true,C.ink);});
  this.h.text(card,'',s.boss?'首领必掉宝石；三星通关额外灵晶':'获胜概率掉落；三星通关额外材料与灵晶',266,256,484,16,11,false,C.muted);
  if(m.stageStars[i]>=3){ // 三星关卡可以扫荡：直接按三星结算，不用再打一遍
   k.btn(card,'adv-go',`出发　体力 ${STAMINA.battleCost}`,128,288,206,50,()=>this.h.startAdventure(),'red',20,'swords');
   for(const [n,x] of [[1,300],[5,420]] as [number,number][])k.btn(card,'sweep'+n,`扫荡×${n}`,x,288,108,50,()=>this.sweep(i,n),m.canSweep(i,n)?'gold':'grey',18);
   this.h.text(card,'',`三星关卡可扫荡 · 总星数 ${m.totalStars}/${STAGES.length*3}`,266,320,484,16,11,false,C.muted);}
  else{k.btn(card,'adv-go',`出发　体力 ${STAMINA.battleCost}`,190,288,290,50,()=>this.h.startAdventure(),'red',24,'swords');
   this.h.text(card,'',`总星数 ${m.totalStars}/${STAGES.length*3}`,450,288,120,20,13,true,C.muted);}}
 private sweep(i:number,n:number){const m=this.m;if(!m.canSweep(i,n)){this.h.say(`体力不足，扫荡 ${n} 次需要 ${STAMINA.battleCost*n} 体力`,1.8);return;}
  const r=m.sweep(i,n)!;m.save();this.h.refresh();this.render();
  this.h.reward(`扫荡 ${n} 次完成`,{b:{coins:r.coins,food:r.food,mats:r.mats,gems:r.gems},sub:`队长经验 +${r.xp}${r.captainLevelUp?'　队长升级！':''}`});}

 update(dt:number){this.t+=dt;const mk=this.marker;if(mk&&mk.isValid){const y0=(mk as any).__y as number;const p=mk.parent?.getComponent(UITransform);const ph=p?.height||MAP.h;mk.setPosition(mk.position.x,ph/2-y0+Math.abs(Math.sin(this.t*4))*7,0);}}
}
