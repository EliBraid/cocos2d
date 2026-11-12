// Small code-drawn widgets shared by the account screens: text helpers, chips, gem and skill icons, pager.
import {Node,Color,Graphics} from 'cc';
import {C} from './PaperUI';
import type {BtnColor} from './PaperUI';
import type {GearHost} from './UIHost';
import {GRADES,gradeColor,parseGem,gemDef,GEMS,MATS,MAT_COLOR} from './meta/Gear';
import {PETS} from './battle/BattleConfig';
import type {Bundle} from './meta/Welfare';
const fmt=(n:number)=>n>=10000?(n/10000).toFixed(n>=100000?0:1)+'万':String(n);
import {col,mix,deep,LEFT} from './uiutil';
import {drawItemIcon} from './ItemIcon';
import {setDef} from './meta/Gear';
import type {SlotId} from './meta/Gear';

export class Kit{
 constructor(public h:GearHost){}
 get ui(){return this.h.ui;}
 /** left-aligned text whose left edge is x0 */
 lt(p:Node,s:string,x0:number,y:number,w:number,h:number,size=14,bold=true,color:Color=C.ink){return this.h.text(p,'',s,x0+w/2,y,w,h,size,bold,color,LEFT);}
 ct(p:Node,s:string,x:number,y:number,w:number,h:number,size=14,bold=true,color:Color=C.ink){return this.h.text(p,'',s,x,y,w,h,size,bold,color);}
 gradeChip(p:Node,x:number,y:number,grade:number,w=52){const c=gradeColor(grade);const n=this.ui.rect(p,'grade',x,y,w,20,mix(c,.55),true);this.ct(n,GRADES[grade].name,w/2,10,w,18,12,true,deep(c,.62));return n;}
 /** small toggle button used by filter bars */
 chip(p:Node,id:string,label:string,x:number,y:number,w:number,on:boolean,fn:()=>void,size=14,h=32){return this.ui.btn(p,id,label,x,y,w,h,fn,on?'gold':'cream',size);}
 dots(g:Graphics,n:number,total:number,gap:number,on:Color,off:Color,r=4){for(let i=0;i<total;i++){g.fillColor=i<n?on:off;g.circle((i-(total-1)/2)*gap,0,r);g.fill();}}
 /** a faceted gem; key null draws an empty socket ring */
 gemIcon(p:Node,x:number,y:number,size:number,key:string|null){const n=this.ui.node(p,'gem',x,y,size*2,size*2),g=n.addComponent(Graphics),s=size*.5;const gm=key?parseGem(key):null;
  if(!gm){g.strokeColor=new Color(130,120,100,255);g.lineWidth=2;g.circle(0,0,s*.8);g.stroke();g.strokeColor=new Color(130,120,100,150);g.moveTo(-s*.3,0);g.lineTo(s*.3,0);g.moveTo(0,-s*.3);g.lineTo(0,s*.3);g.stroke();return n;}
  const c=gemDef(gm.id)!.color,L=gm.lv;
  const P=[[-.6,-.7],[.6,-.7],[1,-.15],[0,1],[-1,-.15]].map(([a,b])=>[a*s,-b*s]);
  g.fillColor=deep(c,.62);g.moveTo(P[0][0],P[0][1]);for(const q of P.slice(1))g.lineTo(q[0],q[1]);g.close();g.fill();
  g.fillColor=col(c);g.moveTo(P[4][0],P[4][1]);g.lineTo(P[0][0],P[0][1]);g.lineTo(-.3*s,.1*s);g.lineTo(0,s);g.close();g.fill();
  g.fillColor=mix(c,.45);g.moveTo(P[0][0],P[0][1]);g.lineTo(P[1][0],P[1][1]);g.lineTo(.3*s,.1*s);g.lineTo(-.3*s,.1*s);g.close();g.fill();
  g.fillColor=mix(c,.2);g.moveTo(P[1][0],P[1][1]);g.lineTo(P[2][0],P[2][1]);g.lineTo(0,s);g.lineTo(.3*s,.1*s);g.close();g.fill();
  g.strokeColor=new Color(40,36,30,255);g.lineWidth=1.8;g.moveTo(P[0][0],P[0][1]);for(const q of P.slice(1))g.lineTo(q[0],q[1]);g.close();g.stroke();
  g.fillColor=new Color(255,255,255,200);for(let i=0;i<Math.min(L,5);i++){g.circle((i-(L-1)/2)*s*.42,-s*1.28,s*.14);g.fill();}
  return n;}
 /** round-cornered icon badge for a skill: element colour behind a kit icon */
 skillBadge(p:Node,x:number,y:number,size:number,icon:string,color:ArrayLike<number>,locked=false){const b=this.ui.rect(p,'skillIcon',x,y,size,size,locked?col([200,198,186]):mix(color,.55),true);
  this.ui.rect(b,'in',size/2,size/2,size-12,size-12,locked?col([218,216,204]):col(color),false);
  this.ui.icon(b,locked?'lock':icon,size/2,size/2,size*.62);return b;}
 /** equipment icon: quality tile + slot silhouette in the set colour + 强化 level */
 itemIcon(p:Node,x:number,y:number,size:number,it:{slot:SlotId;set:string;q:number;lv?:number},tile=true){const n=this.ui.node(p,'itemIcon',x,y,size,size),g=n.addComponent(Graphics);drawItemIcon(g,it.slot,setDef(it.set)?.color||[200,190,170],it.q,size,tile);
  if(it.lv){const b=this.ui.rect(n,'lv',size-12,size-8,24,15,new Color(42,26,18,220),false);this.ct(b,'+'+it.lv,12,7.5,24,13,10,true,C.white);}return n;}
 /** slot silhouette only (no item yet) */
 slotIcon(p:Node,x:number,y:number,size:number,slot:SlotId){const n=this.ui.node(p,'slotIcon',x,y,size,size),g=n.addComponent(Graphics);drawItemIcon(g,slot,[200,192,176],0,size,false);return n;}
 /** reward chips (icon + amount) in a row centred on cx; returns the chip nodes */
 bundleChips(p:Node,cx:number,y:number,b:Bundle,size=44,gap=6):Node[]{const items:((n:Node)=>void)[]=[],counts:string[]=[];const k=this,ui=this.ui;
  const add=(draw:(n:Node)=>void,c:string)=>{items.push(draw);counts.push(c);};
  if(b.pet)add(n=>this.h.sprite(n,'pet:'+b.pet,size/2,size/2,size-6,size-6),PETS[b.pet].name);
  if(b.coins)add(n=>ui.icon(n,'coin',size/2,size/2-3,size*.62),fmt(b.coins));
  if(b.food)add(n=>ui.icon(n,'food',size/2,size/2-3,size*.62),fmt(b.food));
  if(b.stamina)add(n=>ui.icon(n,'energy',size/2,size/2-3,size*.6),'体力'+b.stamina);
  if(b.xp)add(n=>ui.icon(n,'star',size/2,size/2-3,size*.6),'经验'+b.xp);
  if(b.mats)for(const mt of MATS){const v=b.mats[mt.id];if(v)add(n=>{ui.rect(n,'sw',size/2,size/2-3,size*.5,size*.5,col(MAT_COLOR[mt.id]),true);k.ct(n,mt.name[0],size/2,size/2-3,size*.5,size*.4,size*.26,true,C.white);},String(v));}
  if(b.gems)for(const g of Object.keys(b.gems))add(n=>k.gemIcon(n,size/2,size/2-2,size*.36,g),'×'+b.gems![g]);
  const n=items.length,x0=cx-(n*size+(n-1)*gap)/2+size/2;
  const out:Node[]=[];items.forEach((draw,i)=>{const c=ui.frame(p,'rw'+i,x0+i*(size+gap),y,size,size,'card');draw(c);this.h.bold(c,counts[i],size/2,size-7,size+14,16,Math.max(11,Math.round(size*.24)),C.ink,C.white,3);out.push(c);});return out;}
 pager(p:Node,w:number,y:number,page:number,pages:number,set:(n:number)=>void,again:()=>void){if(pages<=1)return 0;
  this.ui.btn(p,'prev','‹',w/2-70,y+20,52,38,()=>{set((page+pages-1)%pages);again();},'cream',22);this.ct(p,`${page+1} / ${pages}`,w/2,y+20,70,20,14,true,C.muted);
  this.ui.btn(p,'next','›',w/2+70,y+20,52,38,()=>{set((page+1)%pages);again();},'cream',22);return 44;}
 btn(p:Node,id:string,label:string,x:number,y:number,w:number,h:number,fn:()=>void,color:BtnColor='cream',size=16,icon?:string){return this.ui.btn(p,id,label,x,y,w,h,fn,color,size,icon);}
}
export {GEMS};
