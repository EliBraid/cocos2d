// Equipment icons, drawn in code so every slot x set x quality looks consistent at any size:
// a quality-coloured tile, the slot's silhouette in the set colour with an ink outline, and the 强化 level.
import {Graphics,Color} from 'cc';
import type {SlotId} from './meta/Gear';
const INK=new Color(42,26,18,255);
const tone=(c:ArrayLike<number>,k:number,a=255)=>k>=0?new Color(c[0]+(255-c[0])*k,c[1]+(255-c[1])*k,c[2]+(255-c[2])*k,a):new Color(c[0]*(1+k),c[1]*(1+k),c[2]*(1+k),a);
const Q_COL:[number,number,number][]=[[176,170,158],[96,178,96],[70,140,230],[170,96,226],[240,160,40]];
type P=[number,number][];
function poly(g:Graphics,pts:P){g.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))g.lineTo(p[0],p[1]);g.close();}
function shape(g:Graphics,pts:P,fill:Color,lw:number){poly(g,pts);g.fillColor=fill;g.fill();poly(g,pts);g.strokeColor=INK;g.lineWidth=lw;g.stroke();}
/** points on a circular arc from angle a0 to a1 (radians, y up) */
function arcPts(cx:number,cy:number,r:number,a0:number,a1:number,n=14):P{const o:P=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;}
function gem(g:Graphics,x:number,y:number,r:number,c:Color,lw:number){shape(g,[[x,y+r],[x+r*.8,y],[x,y-r],[x-r*.8,y]],c,lw);g.fillColor=new Color(255,255,255,170);g.circle(x-r*.25,y+r*.3,r*.22);g.fill();}
/** tile + silhouette. g is centred on the icon; size is the tile edge in px */
export function drawItemIcon(g:Graphics,slot:SlotId|'',set:ArrayLike<number>,q:number,size:number,tile=true){const u=size/2,lw=Math.max(1.5,size*.045);
 const qc=Q_COL[Math.max(0,Math.min(4,q))];
 if(tile){g.fillColor=tone(qc,.72);g.roundRect(-u,-u,size,size,size*.2);g.fill();
  g.fillColor=tone(qc,.45,150);g.roundRect(-u+3,-u+3,size-6,size*.42,size*.16);g.fill();
  g.strokeColor=tone(qc,-.15);g.lineWidth=Math.max(2,size*.06);g.roundRect(-u,-u,size,size,size*.2);g.stroke();
  if(q>=4){g.strokeColor=new Color(255,236,140,200);g.lineWidth=Math.max(1.5,size*.03);g.roundRect(-u+4,-u+4,size-8,size-8,size*.16);g.stroke();}}
 const c=tone(set,0),hi=tone(set,.45),dk=tone(set,-.3),k=u*.82;
 switch(slot){
  case 'helmet':{shape(g,arcPts(0,-.2*k,.8*k,Math.PI,0),c,lw);
   shape(g,[[-.96*k,-.2*k],[.96*k,-.2*k],[.86*k,-.5*k],[-.86*k,-.5*k]],dk,lw);shape(g,[[-.12*k,.58*k],[.12*k,.58*k],[.07*k,.94*k],[-.07*k,.94*k]],hi,lw);
   g.fillColor=new Color(255,255,255,120);g.ellipse(-.32*k,.2*k,.15*k,.26*k);g.fill();break;}
  case 'necklace':{const ch=arcPts(0,.42*k,.62*k,Math.PI,2*Math.PI);for(const [w2,cc] of [[lw*2.4,INK],[lw*1.2,tone([230,200,120],0)]] as [number,Color][]){g.strokeColor=cc;g.lineWidth=w2;g.moveTo(ch[0][0],ch[0][1]);for(const q of ch.slice(1))g.lineTo(q[0],q[1]);g.stroke();}
   gem(g,0,-.42*k,.42*k,c,lw);break;}
  case 'armor':{shape(g,[[-.8*k,.5*k],[-.36*k,.72*k],[0,.5*k],[.36*k,.72*k],[.8*k,.5*k],[.62*k,-.08*k],[.48*k,-.8*k],[-.48*k,-.8*k],[-.62*k,-.08*k]],c,lw);
   g.strokeColor=dk;g.lineWidth=lw;g.moveTo(0,.42*k);g.lineTo(0,-.74*k);g.moveTo(-.5*k,-.3*k);g.lineTo(.5*k,-.3*k);g.stroke();g.fillColor=new Color(255,255,255,110);g.ellipse(-.32*k,.2*k,.14*k,.24*k);g.fill();break;}
  case 'cloak':{shape(g,[[-.3*k,.74*k],[.3*k,.74*k],[.78*k,-.62*k],[.4*k,-.48*k],[0,-.72*k],[-.4*k,-.48*k],[-.78*k,-.62*k]],c,lw);
   g.strokeColor=dk;g.lineWidth=lw;g.moveTo(-.12*k,.6*k);g.lineTo(-.3*k,-.5*k);g.moveTo(.12*k,.6*k);g.lineTo(.3*k,-.5*k);g.stroke();
   g.fillColor=tone([235,200,90],0);g.circle(0,.66*k,.16*k);g.fill();g.strokeColor=INK;g.lineWidth=lw;g.circle(0,.66*k,.16*k);g.stroke();break;}
  case 'ring':{g.strokeColor=INK;g.lineWidth=lw*3.6;g.circle(0,-.2*k,.5*k);g.stroke();g.strokeColor=tone([235,200,90],0);g.lineWidth=lw*1.8;g.circle(0,-.2*k,.5*k);g.stroke();
   gem(g,0,.42*k,.36*k,c,lw);break;}
  case 'charm':{g.strokeColor=INK;g.lineWidth=lw;g.circle(0,.72*k,.14*k);g.stroke();
   shape(g,[[0,.58*k],[.6*k,.3*k],[.52*k,-.3*k],[0,-.82*k],[-.52*k,-.3*k],[-.6*k,.3*k]],c,lw);gem(g,0,0,.26*k,hi,lw);break;}
  case 'legs':{shape(g,[[-.62*k,.72*k],[.62*k,.72*k],[.58*k,-.78*k],[.12*k,-.78*k],[0,.08*k],[-.12*k,-.78*k],[-.58*k,-.78*k]],c,lw);
   shape(g,[[-.62*k,.72*k],[.62*k,.72*k],[.6*k,.5*k],[-.6*k,.5*k]],dk,lw);g.fillColor=hi;g.circle(-.34*k,-.2*k,.14*k);g.circle(.34*k,-.2*k,.14*k);g.fill();break;}
  case 'boots':{shape(g,[[-.46*k,.74*k],[.14*k,.74*k],[.14*k,-.18*k],[.8*k,-.38*k],[.8*k,-.76*k],[-.46*k,-.76*k]],c,lw);
   shape(g,[[-.5*k,.74*k],[.18*k,.74*k],[.18*k,.5*k],[-.5*k,.5*k]],dk,lw);g.strokeColor=INK;g.lineWidth=lw;g.moveTo(-.46*k,-.56*k);g.lineTo(.8*k,-.56*k);g.stroke();break;}
  default:{g.strokeColor=tone(qc,-.2);g.lineWidth=lw*1.4;g.moveTo(-.3*k,0);g.lineTo(.3*k,0);g.moveTo(0,-.3*k);g.lineTo(0,.3*k);g.stroke();}}}
