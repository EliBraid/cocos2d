// Shared drawing kit for the pet species (same ink-outline flat-vector language as the Ember Fox).
import {catmull,d,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,resample} from '../ember-fox/geom.mjs';
export {catmull,d,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,resample};
export const INK='#2a1a12',W=9;let uid=0;const id=p=>p+(++uid);
export const fill=(poly,color,extra='')=>`<path d="${d(poly)}" fill="${color}" ${extra}/>`;
export const line=(pts,w=W,color=INK,extra='')=>`<path d="${d(pts,false)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export const curve=(pts,w=W,color=INK,extra='')=>line(catmull(pts,false,10),w,color,extra);
export const outline=(poly,w=W)=>`<path d="${d(poly)}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
export const clip=(poly,inner)=>{const c=id('c');return `<clipPath id="${c}"><path d="${d(poly)}"/></clipPath><g clip-path="url(#${c})">${inner}</g>`;};
export const hatch=(x,y,n,{dx=13,len=20,ang=-62,w=3.2,op=.45}={})=>{let s='';const a=ang*Math.PI/180;for(let i=0;i<n;i++){const X=x+i*dx,Y=y+i*dx*.18;s+=line([[X,Y],[X+Math.cos(a)*len,Y+Math.sin(a)*len]],w,INK,`opacity="${op}"`);}return s;};
export const part=(contour,base,details='',w=W)=>fill(contour,base)+clip(contour,details)+outline(contour,w);
export const sm=(pts,per=14)=>catmull(pts,true,per);
export const blob=(cx,cy,rx,ry,wob=0,seed=1,n=40)=>{let s=seed*7919;const r=()=>{s=(s*16807)%2147483647;return s/2147483647-.5;};const pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=1+(wob?r()*wob:0);pts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}return pts;};
export const leaf=(x,y,len,wid,ang,col,vein='#3f7a37')=>{const a=ang*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),P=(u,v)=>[x+u*ca-v*sa,y+u*sa+v*ca];const c=sm([P(0,0),P(len*.35,-wid),P(len*.8,-wid*.6),P(len,0),P(len*.8,wid*.6),P(len*.35,wid)],10);return part(c,col,line([P(2,0),P(len*.9,0)],3.5,vein,'opacity=".8"'),6);};
// generic chibi face (3/4 view facing right): positions/size overridable per species
export function face(o={}){const e1=o.eyeL||[508,428],e2=o.eyeR||[640,422],es=o.eyeSize||1,ny=o.nose||[700,470],my=o.mouth||[679,505],col=o.eyeColor||INK,ring=o.eyeRing;
 const eye=(x,y,s=1)=>(ring?fill(ellipse(x,y,23*s,29*s),ring):'')+fill(ellipse(x,y,19*s,25*s),col)+fill(ellipse(x+6*s,y-9*s,7*s,8*s),'#fff')+fill(ellipse(x-6*s,y+10*s,3.5*s,3.5*s),'#fff','opacity=".8"');
 const E={open:eye(e1[0],e1[1],.92*es)+eye(e2[0],e2[1],es),focus:eye(e1[0],e1[1]+6,.9*es)+eye(e2[0],e2[1]+6,.98*es),
  happy:curve([[e1[0]-22,e1[1]+10],[e1[0],e1[1]-14],[e1[0]+22,e1[1]+10]],8)+curve([[e2[0]-24,e2[1]+10],[e2[0],e2[1]-16],[e2[0]+24,e2[1]+10]],8),
  alert:fill(ellipse(e1[0],e1[1]-2,22*es,29*es),col)+fill(ellipse(e1[0]+7,e1[1]-13,8,9),'#fff')+fill(ellipse(e2[0],e2[1]-2,24*es,31*es),col)+fill(ellipse(e2[0]+7,e2[1]-13,9,10),'#fff'),
  sleep:curve([[e1[0]-22,e1[1]],[e1[0],e1[1]+14],[e1[0]+22,e1[1]]],7)+curve([[e2[0]-24,e2[1]],[e2[0],e2[1]+14],[e2[0]+24,e2[1]]],7),
  blink:line([[e1[0]-20,e1[1]+6],[e1[0]+20,e1[1]+6]],7)+line([[e2[0]-22,e2[1]+6],[e2[0]+22,e2[1]+6]],7)};
 const by=o.browY||(e1[1]-46);const bc=o.browColor||INK;
 const B={determined:line([[e1[0]-28,by],[e1[0]+22,by+16]],10,bc)+line([[e2[0]-28,by+12],[e2[0]+28,by-6]],10,bc),calm:curve([[e1[0]-26,by+6],[e1[0],by-2],[e1[0]+22,by+4]],7,bc)+curve([[e2[0]-26,by+2],[e2[0],by-6],[e2[0]+24,by]],7,bc),
  worried:line([[e1[0]-28,by+14],[e1[0]+20,by]],8,bc)+line([[e2[0]-24,by-2],[e2[0]+26,by+12]],8,bc),none:''};
 const nose=o.noseSvg||(fill(sm([[ny[0]-10,ny[1]-4],[ny[0]+18,ny[1]-8],[ny[0]+12,ny[1]+12],[ny[0]+0,ny[1]+16]],6),INK)+fill(ellipse(ny[0]+2,ny[1]-2,5,3),'#fff','opacity=".7"'));
 const mx=my[0],mY=my[1],mc=o.mouthColor||'#7a2a20',tongue=o.tongue||'#f59b97';
 const M=o.mouths||{smile:nose+curve([[mx-31,mY-3],[mx-15,mY+9],[mx,mY-1]],6)+curve([[mx,mY-1],[mx+15,mY+9],[mx+31,mY-3]],6)+line([[mx,mY-13],[mx,mY-1]],5),
  open:nose+part(sm([[mx-29,mY-3],[mx+29,mY-3],[mx+21,mY+33],[mx,mY+43],[mx-21,mY+33]],10),mc,fill(ellipse(mx,mY+37,18,12),tongue),6),
  flat:nose+line([[mx-19,mY+3],[mx+21,mY+1]],6)+line([[mx,mY-13],[mx,mY+1]],5),
  o:nose+part(ellipse(mx,mY+9,11,13),mc,'',5)};
 return {eyes:{variants:E,pivot:[574,425]},brows:{variants:B,pivot:[574,388]},mouth:{variants:M,pivot:[690,500]}};}
