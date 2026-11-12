// 冰豆企鹅 — round penguin with a snowflake scarf and a snowball.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={bk:'#33414f',bkSh:'#222d38',bkHi:'#52667a',wh:'#fff8ea',whSh:'#e6dcc6',or:'#ff9d3a',orSh:'#d9741a',bl:'#8fd3f0',blSh:'#5fb2dc',blHi:'#c4ecfb',ice:'#e8f7ff'};
const flake=(x,y,s)=>{let o='';for(let i=0;i<3;i++){const a=i*Math.PI/3,dx=Math.cos(a)*s,dy=Math.sin(a)*s;o+=line([[x-dx,y-dy],[x+dx,y+dy]],3,'#fff');}return o;};
export function front(){
 const P={};
 P.tail={svg:part(sm([[430,830],[350,850],[300,880],[360,896],[440,880]],10),K.bkSh,hatch(340,860,3,{ang:-40})),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 // webbed orange feet (no leg shaft)
 const foot=(x,sh)=>{const c=sm([[x-36,740],[x+36,740],[x+38,880],[x+30,910]],8);const f=sm([[x-52,930],[x-30,912],[x+6,908],[x+44,914],[x+72,938],[x+66,952],[x-58,952]],8);return part(sm([[x-34,740],[x+34,740],[x+36,900],[x-36,900]],8),sh?K.bkSh:K.bk,'')+part(f,sh?K.orSh:K.or,line([[x-18,916],[x-18,950]],4,INK,'opacity=".5"')+line([[x+14,914],[x+14,950]],4,INK,'opacity=".5"')+line([[x+42,920],[x+42,950]],4,INK,'opacity=".5"'));};
 P['leg-far']={svg:foot(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:foot(556,false),pivot:[560,930],hip:[560,780]};
 // flippers
 const fl=(x1,y1,x2,y2,c)=>part(capsule(x1,y1,34,x2,y2,22),c,fill(capsule(x1+8,y1+10,16,x2+4,y2-14,10),K.bkHi,'opacity=".5"'));
 P['arm-far']={svg:fl(424,640,380,742,K.bkSh),pivot:[424,640]};
 P['arm-near']={svg:fl(594,640,638,744,K.bk),pivot:[594,640],hand:[642,754]};
 // pear-shaped body, white belly
 const bodyC=sm([[430,566],[505,552],[590,568],[640,650],[652,760],[612,850],[505,884],[400,858],[362,764],[376,654]],16);
 P.body={svg:part(bodyC,K.bk,fill(sm([[505,590],[590,606],[622,700],[612,800],[570,858],[505,872],[446,850],[410,780],[414,690],[450,610]],14),K.wh)+fill(ellipse(572,830,56,34),K.whSh)+fill(sm([[380,700],[420,640],[430,780],[400,840]],8),K.bkSh)+hatch(400,720,3,{ang:-75,op:.4})+curve([[500,720],[520,730]],3.5,INK,'opacity=".3"')),pivot:[505,862],neck:[505,580]};
 // head: black cap, white face, orange beak drawn in the mouth slot
 const headC=sm([[515,222],[650,236],[742,310],[768,420],[744,520],[650,574],[520,594],[392,570],[298,506],[280,400],[316,300],[410,238]],20);
 P.head={svg:part(headC,K.bk,fill(sm([[400,420],[470,380],[570,398],[690,380],[760,430],[744,520],[650,574],[520,592],[420,566],[352,500]],14),K.wh)+fill(sm([[320,300],[420,244],[520,236],[470,300],[380,330]],10),K.bkHi,'opacity=".5"')+fill(ellipse(466,506,40,22),'#f6a0a0','opacity=".8"')+fill(ellipse(704,500,24,14),'#f6a0a0','opacity=".8"')+hatch(330,330,3,{ang:-70,op:.35})),pivot:[515,585]};
 const beak=part(sm([[664,462],[744,474],[760,490],[700,516],[664,500]],6),K.or,fill(sm([[670,494],[746,490],[700,516],[666,502]],6),K.orSh),6);
 Object.assign(P,face({eyeL:[510,428],eyeR:[640,422],mouths:{smile:beak,open:beak+fill(sm([[690,508],[736,500],[726,534],[700,538]],6),'#7a2a20'),flat:beak,o:beak},browColor:K.bkSh}));
 // snowflake scarf
 const wrap=sm([[390,560],[505,546],[640,556],[664,596],[620,632],[505,640],[410,622],[372,590]],14);
 P['scarf-wrap']={svg:part(wrap,K.bl,fill(sm([[372,604],[505,620],[656,604],[620,634],[505,644],[410,626]],10),K.blSh)+curve([[420,580],[505,592],[610,584]],3.5,INK,'opacity=".4"')+flake(470,598,12)+flake(560,596,10)),pivot:[505,592]};
 const sr=ribbon([[480,596],[420,606],[360,592],[300,566],[246,556],[196,530]],[32,36,36,34,30,26]);
 P['scarf-tail']={svg:part(sr.contour,K.bl,fill(ribbon([[440,612],[380,606],[326,584],[270,568]],[10,12,12,10]).contour,K.blSh)+flake(360,596,12)+flake(280,566,10)+line([[190,516],[188,552]],4,INK,'opacity=".5"')+line([[206,512],[204,548]],4,INK,'opacity=".5"')+line([[222,516],[222,546]],4,INK,'opacity=".5"')),bones:[['scarf',[478,590]],['scarf-mid',[350,578]],['scarf-tip',[222,520]]]};
 // snowball in hand
 P.sword={svg:`<g transform="translate(656 742)">${part(sm([[-44,0],[-30,-34],[0,-48],[32,-36],[48,0],[34,34],[0,46],[-30,34]],8),K.ice,fill(ellipse(16,18,26,22),'#cfe9f7')+fill(ellipse(-14,-16,12,8),'#fff')+curve([[-20,10],[-6,20]],3.5,K.blSh)+curve([[10,-20],[28,-8]],3.5,K.blSh))}</g>`,pivot:[642,754]};
 return P;
}
