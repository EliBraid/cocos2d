// Monster parts for the battle (毛球怪 / 蘑菇怪 / 角魔), same ink style as the fox.
// Shared canvas 400x400, feet on y≈380.
import {catmull,d,ellipse,tuftsAt,tuftRun,capsule} from './geom.mjs';
const INK='#2a1a12',W=8;let uid=0;const id=()=> 'm'+(++uid);
const fill=(p,c,x='')=>`<path d="${d(p)}" fill="${c}" ${x}/>`;
const line=(p,w=W,c=INK,x='')=>`<path d="${d(p,false)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
const curve=(p,w=W,c=INK,x='')=>line(catmull(p,false,10),w,c,x);
const outline=(p,w=W)=>`<path d="${d(p)}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
const clip=(p,inner)=>{const c=id();return `<clipPath id="${c}"><path d="${d(p)}"/></clipPath><g clip-path="url(#${c})">${inner}</g>`;};
const part=(c,base,det='',w=W)=>fill(c,base)+clip(c,det)+outline(c,w);
const sm=(p,n=14)=>catmull(p,true,n);
const hatch=(x,y,n,ang=-60,op=.4)=>{let s='';const a=ang*Math.PI/180;for(let i=0;i<n;i++)s+=line([[x+i*11,y+i*2],[x+i*11+Math.cos(a)*16,y+i*2+Math.sin(a)*16]],3,INK,`opacity="${op}"`);return s;};
const feet=(col)=>({'foot-left':part(ellipse(168,372,26,15),col),'foot-right':part(ellipse(236,372,26,15),col)});
function fuzzBody(base,shade,hi){const c=tuftsAt(sm([[200,190],[268,206],[300,262],[296,330],[250,370],[150,370],[104,330],[100,262],[132,206]],16),
  [...tuftRun([140,200],[260,200],5,40,18,0),...tuftRun([104,250],[110,350],4,40,18,-.3),...tuftRun([296,250],[290,350],4,40,18,.3),...tuftRun([150,372],[250,372],4,36,12,0)]);
 return part(c,base,fill(ellipse(160,330,90,60),shade)+fill(ellipse(236,236,46,26,72,.3),hi,'opacity=".7"')+hatch(130,300,3,-70,.35)+hatch(250,330,2,-110,.3));}
const angry=(ex=200,ey=290,s=1,glow='#e5322b')=>{const eye=(x,y,flip)=>fill(ellipse(x,y,15*s,13*s),'#fff')+outline(ellipse(x,y,15*s,13*s),5)+fill(ellipse(x,y+1,8*s,8*s),glow)+fill(ellipse(x,y+1,3.5*s,3.5*s),INK)+line([[x-20*s*flip,y-24*s],[x+16*s*flip,y-12*s]],8);
 return eye(ex-34*s,ey,1)+eye(ex+34*s,ey,-1)+curve([[ex-18*s,ey+34*s],[ex,ey+26*s],[ex+18*s,ey+34*s]],6)+fill([[ex-8*s,ey+28*s],[ex-3*s,ey+40*s],[ex+1*s,ey+28*s]],'#fff')+line([[ex-8*s,ey+28*s],[ex-3*s,ey+40*s],[ex+1*s,ey+28*s]],3);};
const hurt=(ex=200,ey=290,s=1)=>{const x=(cx,cy)=>line([[cx-11*s,cy-11*s],[cx+11*s,cy+11*s]],7)+line([[cx-11*s,cy+11*s],[cx+11*s,cy-11*s]],7);return x(ex-34*s,ey)+x(ex+34*s,ey)+part(ellipse(ex,ey+34*s,12*s,10*s),'#7a2a20','',5);};
export function fuzz(){return {...feet('#4a3a33'),body:fuzzBody('#fbf7ee','#e0d8c8','#ffffff'),
 top:part(sm([[150,214],[140,176],[134,148],[162,170],[176,206]],8),'#efe3c8',line([[146,180],[160,186]],3,INK,'opacity=".5"'))+part(sm([[224,206],[238,170],[266,148],[260,176],[250,214]],8),'#efe3c8',line([[242,186],[256,180]],3,INK,'opacity=".5"')),
 'face-angry':angry(),'face-hurt':hurt()};}
export function elite(){return {...feet('#2f2430'),body:fuzzBody('#6b5a78','#4d3f5a','#8f7da0'),
 top:part(sm([[150,220],[110,190],[78,130],[96,92],[110,150],[150,186],[180,206]],10),'#efe3c8',hatch(96,140,2,-40,.4))+part(sm([[220,206],[250,186],[290,150],[304,92],[322,130],[290,190],[250,220]],10),'#efe3c8',hatch(286,140,2,-140,.4)),
 'face-angry':angry(200,290,1.08,'#ff3a2a'),'face-hurt':hurt(200,290,1.08)};}
export function shroom(){const stem=tuftsAt(sm([[150,260],[250,260],[262,330],[246,372],[154,372],[138,330]],12),[...tuftRun([150,372],[250,372],3,30,8,0)]);
 const cap=tuftsAt(sm([[200,140],[290,170],[322,236],[300,262],[200,272],[100,262],[78,236],[110,170]],16),[]);
 const spots=[[160,190,20,15],[232,176,16,12],[270,226,18,13],[124,238,14,10],[200,232,22,14]].map(([x,y,a,b])=>fill(ellipse(x,y,a,b),'#3b2b26')).join('');
 return {...feet('#4a3a33'),body:part(stem,'#f3e6cf',fill(ellipse(160,330,50,50),'#ddcdb2')+hatch(150,310,2,-70,.35)),
  top:part(cap,'#fbf7ee',fill(ellipse(140,250,110,40),'#e0d8c8')+spots+fill(ellipse(240,180,40,16,72,.3),'#fff','opacity=".8"')),
  'face-angry':angry(200,312,.72),'face-hurt':hurt(200,312,.72)};}
