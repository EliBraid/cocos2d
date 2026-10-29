// 火苗鸡 — fluffy fire chick. Flame crest acts as ears, orange-tipped wings as arms.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={y:'#ffd43c',ySh:'#f0aa1c',yHi:'#ffe98a',cr:'#fff1a8',crSh:'#f3d36a',or:'#ff8a2a',orSh:'#e0601a',fl:'#ffd34a',leg:'#f08a2a',legSh:'#c96a18'};
const flame=(x,y,h,w,ang,c,inner)=>{const a=ang*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),P=(u,v)=>[x+u*ca-v*sa,y+u*sa+v*ca];return part(sm([P(0,-w),P(h*.3,-w*1.1),P(h*.62,-w*.5),P(h,0),P(h*.7,w*.3),P(h*.5,w*1.0),P(h*.2,w*1.1),P(0,w)],10),c,fill(sm([P(h*.05,-w*.5),P(h*.4,-w*.5),P(h*.7,0),P(h*.4,w*.5),P(h*.05,w*.5)],8),inner),7);};
export function front(){
 const P={};
 P.tail={svg:flame(440,820,150,38,196,K.or,K.fl)+flame(440,830,130,30,176,K.ySh,K.yHi),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const toes=[[[x,930],[x-40,950]],[[x,930],[x+2,954]],[[x,930],[x+44,948]]].map(([a,b])=>line([a,b],10,INK)+line([a,b],4,sh?K.legSh:K.leg)).join('');return line([[x,730],[x,930]],20,INK)+line([[x,730],[x,930]],10,sh?K.legSh:K.leg)+toes;};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const wing=(x,y,l,c,tip)=>part(sm([[x-32,y],[x+32,y],[x+46,y+l*.45],[x+34,y+l],[x+4,y+l+18],[x-26,y+l],[x-46,y+l*.45]],12),c,fill(sm([[x-46,y+l*.5],[x+46,y+l*.5],[x+34,y+l],[x+4,y+l+18],[x-26,y+l]],10),tip)+line([[x-14,y+l*.6],[x-16,y+l]],3.5,INK,'opacity=".5"')+line([[x+14,y+l*.6],[x+12,y+l+8]],3.5,INK,'opacity=".5"'));
 P['arm-far']={svg:wing(424,640,120,K.ySh,K.orSh),pivot:[424,640]};
 P['arm-near']={svg:wing(594,640,120,K.y,K.or),pivot:[594,640],hand:[642,754]};
 const bodyC=tufts(sm([[430,570],[505,556],[590,570],[640,650],[652,760],[610,848],[505,880],[400,858],[362,766],[376,654]],16),[...clumps(.12,.45,5,38,10,.5,7),...clumps(.58,.92,4,38,10,-.5,8)]);
 P.body={svg:part(bodyC,K.y,fill(sm([[505,596],[596,610],[630,700],[620,800],[574,860],[505,874],[444,850],[408,780],[410,690],[446,610]],14),K.cr)+hatch(440,660,6,{ang:-80,op:.35,dx:20,len:24})+fill(ellipse(380,760,60,130),K.ySh,'opacity=".7"')),pivot:[505,862],neck:[505,580]};
 // flame crest = the two ear slots
 P['ear-far']={svg:flame(470,270,250,46,-106,K.orSh,K.ySh)+flame(440,285,180,34,-140,K.or,K.fl),pivot:[420,290]};
 P['ear-near']={svg:flame(570,262,290,52,-80,K.or,K.fl)+flame(600,270,200,38,-46,K.orSh,K.ySh),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,224],[646,238],[740,312],[768,420],[746,516],[656,576],[520,596],[390,572],[294,506],[276,400],[312,300],[410,238]],20),
  [[[488,226],34,14,-.5],[[530,222],30,14,.5],...tuftRun([284,430],[384,572],5,62,30,-.3),...tuftRun([772,430],[722,550],4,58,28,.3),[[660,572],50,18,.3]]);
 P.head={svg:part(headC,K.y,fill(ellipse(334,380,110,200),K.ySh,'opacity=".6"')+fill(ellipse(640,300,90,46,72,.3),K.yHi,'opacity=".7"')+fill(ellipse(450,510,46,26),'#ff9a6a','opacity=".8"')+fill(ellipse(712,500,26,15),'#ff9a6a','opacity=".8"')+hatch(330,340,4,{ang:-70,op:.3})),pivot:[515,585]};
 const beak=part(sm([[670,462],[770,486],[690,524]],6),K.or,fill(sm([[690,492],[760,490],[690,524]],6),K.orSh),6);
 Object.assign(P,face({nose:[700,470],mouths:{smile:beak,open:beak+fill(sm([[700,512],[748,504],[736,544],[704,544]],6),'#7a2a20'),flat:beak,o:beak},browColor:K.orSh}));
 return P;
}
