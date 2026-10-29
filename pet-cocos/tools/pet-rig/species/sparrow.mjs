// 栗栗雀 — chestnut sparrow with a slingshot. Wings act as arms, feather crest acts as ears.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={b:'#b8602f',bSh:'#8f431d',bHi:'#d98348',cr:'#fff0d4',crSh:'#ecd3a8',dk:'#4a2a1a',or:'#f0a040',orSh:'#c97a1a',wood:'#8a5a30',woodSh:'#6a4020',band:'#e8c070'};
const feather=(x,y,len,w,ang,c,sh)=>{const a=ang*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),P=(u,v)=>[x+u*ca-v*sa,y+u*sa+v*ca];return part(sm([P(0,-w*.4),P(len*.5,-w),P(len,0),P(len*.5,w),P(0,w*.4)],10),c,line([P(4,0),P(len*.85,0)],3.5,INK,'opacity=".4"')+fill(sm([P(len*.4,-w*.2),P(len*.9,0),P(len*.4,w)],8),sh,'opacity=".6"'),7);};
export function front(){
 const P={};
 // tail feathers fanning to the left/back
 P.tail={svg:feather(430,830,200,26,200,K.bSh,K.dk)+feather(430,834,210,26,185,K.b,K.bSh)+feather(430,840,200,26,168,K.bSh,K.dk),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 // thin legs with toes
 const leg=(x,sh)=>{const c=sm([[x-8,740],[x+8,740],[x+8,900],[x-8,900]],6);const toes=[[[x,930],[x-44,948]],[[x,930],[x+4,952]],[[x,930],[x+48,946]]].map(([a,b])=>line([a,b],10,INK)+line([a,b],4,sh?K.orSh:K.or)).join('');
  return line([[x,730],[x,930]],20,INK)+line([[x,730],[x,930]],10,sh?K.orSh:K.or)+toes+line([[x,930],[x,930]],6,INK);};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 // wings as arms (hanging, feather tips pointing down)
 const wing=(x,y,l,c,sh)=>part(sm([[x-30,y],[x+30,y],[x+44,y+l*.5],[x+30,y+l],[x,y+l+20],[x-30,y+l],[x-44,y+l*.5]],12),c,fill(sm([[x-10,y+l*.5],[x+34,y+l*.45],[x+22,y+l],[x-4,y+l+14]],8),sh)+line([[x-14,y+l*.55],[x-18,y+l]],3.5,INK,'opacity=".5"')+line([[x+8,y+l*.55],[x+8,y+l+10]],3.5,INK,'opacity=".5"'));
 P['arm-far']={svg:wing(424,640,120,K.bSh,K.dk),pivot:[424,640]};
 P['arm-near']={svg:wing(594,640,120,K.b,K.bSh),pivot:[594,640],hand:[642,754]};
 const bodyC=tufts(sm([[430,570],[505,556],[590,570],[636,650],[646,760],[606,848],[505,880],[404,858],[368,766],[380,654]],16),[...clumps(.15,.42,4,34,8,.5,7),...clumps(.62,.9,3,34,8,-.5,8)]);
 P.body={svg:part(bodyC,K.b,fill(sm([[505,596],[596,610],[628,700],[618,800],[574,860],[505,874],[444,850],[408,780],[410,690],[446,610]],14),K.cr)+hatch(440,640,6,{ang:-80,op:.35,dx:20,len:26})+hatch(470,760,5,{ang:-80,op:.3,dx:22,len:24})+fill(ellipse(574,830,56,34),K.crSh)),pivot:[505,862],neck:[505,580]};
 // crest feathers act as ears
 P['ear-far']={svg:feather(430,300,120,20,-130,K.bSh,K.dk),pivot:[420,290]};
 P['ear-near']={svg:feather(560,262,130,22,-62,K.b,K.bSh),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,224],[644,238],[736,312],[764,420],[742,516],[652,574],[520,594],[392,570],[298,506],[280,400],[316,300],[410,238]],20),
  [[[488,226],34,12,-.5],[[530,222],30,12,.5],...tuftRun([288,430],[384,570],4,66,26,-.3),...tuftRun([768,430],[718,548],3,60,22,.3)]);
 P.head={svg:part(headC,K.b,fill(ellipse(336,380,110,200),K.bSh,'opacity=".8"')+fill(ellipse(636,300,90,46,72,.3),K.bHi,'opacity=".6"')+fill(sm([[380,470],[460,440],[560,462],[660,452],[760,450],[744,520],[652,574],[520,592],[400,566],[336,512]],12),K.cr)+fill(sm([[420,400],[470,370],[520,420],[470,470],[420,450]],10),K.dk,'opacity=".9"')+fill(ellipse(704,502,22,13),'#f6a0a0','opacity=".8"')+hatch(330,340,4,{ang:-70,op:.35})),pivot:[515,585]};
 const beak=(open)=>part(sm([[672,456],[780,484],[690,520]],6),K.or,fill(sm([[690,490],[772,490],[690,520]],6),K.orSh),6);
 Object.assign(P,face({nose:[700,470],mouths:{smile:beak(),open:beak()+fill(sm([[700,508],[748,500],[736,540],[704,540]],6),'#7a2a20'),flat:beak(),o:beak()},browColor:K.bSh,eyeL:[508,428],eyeR:[638,422]}));
 // slingshot
 const y=part(sm([[-12,0],[12,0],[10,110],[-10,110]],4),K.wood)+line([[0,0],[-44,-70]],18,INK)+line([[0,0],[-44,-70]],10,K.wood)+line([[0,0],[40,-76]],18,INK)+line([[0,0],[40,-76]],10,K.wood)+line([[-44,-70],[40,-76]],5,K.band);
 P.sword={svg:`<g transform="translate(646 740) rotate(18)">${y}</g>`,pivot:[642,754]};
 return P;
}
