// 月绒兔 — lavender lop-eared rabbit with a moon mark and a star wand.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={l:'#c7b3ea',lSh:'#a58bd3',lHi:'#dccdf5',cr:'#fff2f8',crSh:'#ecd3e6',pink:'#f4b0cc',gold:'#f6c330',goldSh:'#c7860f'};
export function front(){
 const P={};
 const pu=tuftsAt(sm([[380,830],[330,800],[300,830],[310,880],[360,900],[420,880]],10),tuftRun([300,840],[400,900],4,40,16,.3));
 P.tail={svg:part(pu,K.cr,fill(ellipse(350,860,40,26),K.crSh)+hatch(320,830,3,{ang:-40})),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const c=sm([[x-36,740],[x+36,740],[x+40,860],[x+54,914],[x+54,946],[x-36,950],[x-54,926],[x-40,860]],12);return part(c,sh?K.lSh:K.l,fill(ellipse(x+4,928,62,28),K.cr)+fill(ellipse(x+4,934,18,10),K.pink)+hatch(x-20,790,2,{ang:-70,op:.25}));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const paw=(x,y,c)=>part(ellipse(x,y,36,33),c,line([[x-8,y+12],[x-8,y+26]],3.5)+line([[x+8,y+14],[x+8,y+28]],3.5));
 P['arm-far']={svg:part(capsule(424,640,26,392,722,23),K.lSh)+paw(384,752,K.cr),pivot:[424,640]};
 const bodyC=tufts(sm([[432,572],[505,558],[584,572],[622,650],[630,760],[598,846],[505,878],[418,860],[384,770],[394,652]],16),[...clumps(.15,.42,4,36,9,.5,7),...clumps(.62,.9,3,36,8,-.5,8)]);
 P.body={svg:part(bodyC,K.l,fill(ellipse(392,760,80,150),K.lSh)+fill(sm([[505,598],[584,604],[612,690],[606,792],[566,856],[502,866],[480,790],[478,682]],12),K.cr)+hatch(402,700,3,{ang:-75,op:.3})),pivot:[505,862],neck:[505,580]};
 // long lop ears hanging beside the face
 const ear=(pts,seed,c,sh)=>part(tufts(sm(pts,14),clumps(0,.5,4,36,9,.4,seed)),c,fill(sm(pts.map(([x,y],i)=>[x+(i<4?10:-10),y+(i<4?8:-8)]).slice(1,7),10),K.pink,'opacity=".55"')+hatch(pts[1][0]-10,pts[1][1]+60,4,{ang:-80,op:.35}));
 P['ear-far']={svg:ear([[440,262],[360,236],[290,330],[238,480],[236,640],[290,700],[350,650],[390,520],[440,380]],21,K.lSh),pivot:[420,290]};
 P['ear-near']={svg:ear([[610,258],[690,236],[770,330],[816,480],[818,640],[764,704],[704,650],[664,520],[612,380]],23,K.l),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,228],[640,244],[726,314],[760,420],[738,512],[652,572],[520,592],[396,568],[300,502],[286,400],[322,304],[410,242]],20),
  [[[488,230],36,14,-.5],[[530,226],34,14,.5],...tuftRun([292,420],[384,566],4,68,30,-.3),...tuftRun([764,424],[714,546],3,64,28,.3),[[660,568],54,18,.3]]);
 const moon=`<path d="M470 256 a34 34 0 1 0 44 44 a28 28 0 1 1 -44 -44z" fill="${K.gold}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
 P.head={svg:part(headC,K.l,fill(ellipse(340,380,110,200),K.lSh,'opacity=".8"')+fill(ellipse(640,300,90,46,72,.3),K.lHi,'opacity=".6"')+fill(sm([[400,470],[470,452],[560,476],[650,458],[756,448],[740,516],[652,572],[520,590],[420,566],[360,510]],12),K.cr)+fill(ellipse(466,510,40,22),K.pink,'opacity=".85"')+fill(ellipse(700,500,24,14),K.pink,'opacity=".8"')+hatch(330,360,3,{ang:-70,op:.3})+moon),pivot:[515,585]};
 Object.assign(P,face({eyeRing:'#5a4a8a',eyeColor:'#2a1a3a',noseSvg:fill(sm([[692,466],[716,464],[704,484]],6),K.pink)+line([[704,484],[704,494]],4),browColor:'#6a5a9a'}));
 P['arm-near']={svg:part(capsule(594,640,26,628,724,24),K.l)+paw(642,754,K.cr),pivot:[594,640],hand:[642,754]};
 // star wand
 const star=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?22:50;star.push([Math.cos(a)*r,Math.sin(a)*r]);}
 P.sword={svg:`<g transform="translate(646 748) rotate(30)">${part(sm([[-7,-20],[7,-20],[7,120],[-7,120]],4),'#d9a066','')+`<g transform="translate(0 -62)">${part(star,K.gold,fill(star.map(([x,y])=>[x*.6,y*.6]),'#ffe27a'),6)}</g>`}</g>`,pivot:[642,754]};
 return P;
}
