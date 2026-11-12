// "恭喜获得" overlay: light rays, confetti, the rewards popping in one by one. Tap anywhere to close.
// Used by every claim button (签到, 在线, 任务, 成就, 邮件, 图鉴, 队长路线, 训练/放养) and by the 孵化屋 when the reels stop.
import {Node,Color,Graphics,UIOpacity} from 'cc';
import {C} from './PaperUI';
import {PETS} from './battle/BattleConfig';
import {GRADES,gradeColor} from './meta/Gear';
import type {Bundle} from './meta/Welfare';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import {col,mix,deep} from './uiutil';
export interface PopPet{kind:string;grade:number;tag:string;hot:boolean}
export interface PopOpts{b?:Bundle;pets?:PopPet[];sub?:string;extra?:{icon:string;label:string}[]}
export class RewardPop{
 private k:Kit;private node:Node|null=null;private t=0;private rays:Graphics|null=null;private fx:Graphics|null=null;private cells:{n:Node;d:number}[]=[];private hint:Node|null=null;
 private parts:{x:number;y:number;vx:number;vy:number;c:Color;s:number;r:number}[]=[];private gold=false;
 constructor(private h:GearHost,private root:()=>Node){this.k=new Kit(h);}
 get open(){return !!this.node?.isValid;}
 show(title:string,o:PopOpts){this.close();const ui=this.h.ui,R=this.root(),L=ui.node(R,'RewardPop',270,480,540,960);this.node=L;this.t=0;this.cells=[];this.parts=[];
  const best=Math.max(-1,...(o.pets||[]).map(p=>p.grade));this.gold=best>=3;
  const dim=ui.rect(L,'Dim',270,480,540,960,new Color(24,20,16,190),false);this.h.tap(dim,()=>{if(this.t>.45)this.close();});
  this.rays=ui.node(L,'Rays',270,430,700,700).addComponent(Graphics);this.fx=ui.node(L,'Fx',270,480,540,960).addComponent(Graphics);
  const rib=ui.frame(L,'Title',270,250,Math.max(260,title.length*34+120),64,'ribbon');const rw=Math.max(260,title.length*34+120);this.h.bold(rib,title,rw/2,27,rw-100,40,28,C.white,C.ink,3);this.cells.push({n:rib,d:0});
  if(o.sub){const s=this.h.bold(L,o.sub,270,300,460,24,16,new Color(255,236,170),C.ink,3) as any;this.cells.push({n:s.node,d:.08});}
  let y=420;const pets=o.pets||[];
  if(pets.length){const cw=128,ch=170;pets.forEach((p,i)=>{const x=270+(i-(pets.length-1)/2)*(cw+14),c=gradeColor(p.grade),card=ui.rect(L,'pet'+i,x,y,cw,ch,mix(c,.78),true);
    ui.rect(card,'band',cw/2,10,cw-8,16,col(c),false);this.h.bold(card,GRADES[p.grade].name,cw/2,10,cw,16,13,C.white,C.ink,2);
    this.h.sprite(card,'pet:'+p.kind,cw/2,72,96,96);this.k.ct(card,PETS[p.kind].name,cw/2,128,cw,20,16,true,deep(c,.5));this.k.ct(card,p.tag,cw/2,150,cw,16,12,true,p.hot?C.red:C.muted);
    this.cells.push({n:card,d:.2+i*.22});});y+=ch/2+20;}
  const chipN=(o.b?this.countChips(o.b):0)+(o.extra?.length||0);
  if(chipN){const size=chipN>4?62:76,cy=pets.length?y+size/2:y;const cs=o.b?this.k.bundleChips(L,270-((o.extra?.length||0)*(size+10))/2,cy,o.b,size,10):[];
   const ex=(o.extra||[]).map((e,i)=>{const x=270+((cs.length+i)-(chipN-1)/2)*(size+10),c=ui.frame(L,'ex'+i,x,cy,size,size,'card');ui.icon(c,e.icon,size/2,size/2-4,size*.55);this.h.bold(c,e.label,size/2,size-8,size+18,18,13,C.ink,C.white,3);return c;});
   [...cs,...ex].forEach((n,i)=>this.cells.push({n,d:.2+(pets.length?pets.length*.22:0)+i*.12}));y=cy+size/2+10;}
  const hint=this.h.bold(L,'点击任意位置继续',270,Math.max(y+60,640),300,24,16,new Color(255,250,230),C.ink,3) as any;this.hint=hint.node;
  for(const c of this.cells)c.n.setScale(0,0,1);const op=L.addComponent(UIOpacity);op.opacity=0;
  // confetti burst
  const cols=this.gold?[[255,214,80],[255,244,180],[255,170,60],[255,255,255]]:[[255,120,110],[110,200,255],[130,220,120],[255,214,80],[200,150,255]];
  for(let i=0;i<(this.gold?70:44);i++){const a=Math.random()*Math.PI*2,v=200+Math.random()*320,c=cols[i%cols.length];this.parts.push({x:270,y:300,vx:Math.cos(a)*v,vy:Math.sin(a)*v-200,c:new Color(c[0],c[1],c[2],255),s:4+Math.random()*5,r:Math.random()*6});}}
 private countChips(b:Bundle){let n=0;if(b.pet)n++;if(b.coins)n++;if(b.food)n++;if(b.stamina)n++;if(b.xp)n++;if(b.mats)n+=Object.values(b.mats).filter(Boolean).length;if(b.gems)n+=Object.keys(b.gems).length;return n;}
 close(){if(this.node?.isValid)this.node.destroy();this.node=null;}
 update(dt:number){const L=this.node;if(!L||!L.isValid){this.node=null;return;}this.t+=dt;const t=this.t,R=L.parent;if(R)L.setSiblingIndex(R.children.length-1);
  const op=L.getComponent(UIOpacity);if(op)op.opacity=Math.round(255*Math.min(1,t/.15));
  const back=(k:number)=>{k=Math.max(0,Math.min(1,k));const c=2.2;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
  for(const c of this.cells){const k=(t-c.d)/.32,s=k<=0?0:back(k);c.n.setScale(s,s,1);}
  const g=this.rays!;g.clear();const ra=Math.min(1,t/.4);const col1=this.gold?new Color(255,214,90,Math.round(42*ra)):new Color(255,236,170,Math.round(26*ra));
  for(let i=0;i<12;i++){const a=t*.4+i*Math.PI/6;g.fillColor=col1;g.moveTo(0,0);g.lineTo(Math.cos(a-.08)*330,Math.sin(a-.08)*330);g.lineTo(Math.cos(a+.08)*330,Math.sin(a+.08)*330);g.close();g.fill();}
  g.fillColor=this.gold?new Color(255,226,120,Math.round(110*ra)):new Color(255,244,210,Math.round(70*ra));g.circle(0,0,120+8*Math.sin(t*3));g.fill();
  const f=this.fx!;f.clear();for(const p of this.parts){const x=p.x+p.vx*t,y=p.y+p.vy*t+420*t*t;if(y>1000)continue;const a=Math.max(0,1-t/2.2);if(a<=0)continue;
   f.fillColor=new Color(p.c.r,p.c.g,p.c.b,Math.round(255*a));const cx=x-270,cy=480-y,rr=p.r+t*6,s=p.s;f.moveTo(cx+Math.cos(rr)*s,cy+Math.sin(rr)*s);f.lineTo(cx+Math.cos(rr+1.6)*s*.5,cy+Math.sin(rr+1.6)*s*.5);f.lineTo(cx-Math.cos(rr)*s,cy-Math.sin(rr)*s);f.lineTo(cx-Math.cos(rr+1.6)*s*.5,cy-Math.sin(rr+1.6)*s*.5);f.close();f.fill();}
  if(this.hint){const ho=this.hint.getComponent(UIOpacity)||this.hint.addComponent(UIOpacity);ho.opacity=t<.6?0:Math.round(150+100*Math.sin(t*4));}}
}
