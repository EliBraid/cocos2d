// 石甲龟 — sleepy tortoise with a carved stone shell (the shell is the body).
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={s:'#dfd49a',sSh:'#c3b676',sHi:'#f2ebbd',spot:'#a89a55',st:'#aeb4ba',stSh:'#868d96',stHi:'#d3d8dc',stDk:'#58606a',pink:'#f2a79c'};
export function front(){
 const P={};
 P.tail={svg:part(sm([[430,830],[360,846],[330,880],[380,896],[440,880]],8),K.sSh,''),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const c=sm([[x-46,740],[x+46,740],[x+50,860],[x+62,910],[x+62,944],[x-44,948],[x-60,924],[x-50,860]],12);return part(c,sh?K.sSh:K.s,fill(ellipse(x+4,930,70,26),sh?K.sSh:K.sHi)+fill(ellipse(x-6,800,14,10),K.spot,'opacity=".8"')+fill(ellipse(x+20,850,10,8),K.spot,'opacity=".8"')+line([[x-26,936],[x-24,948]],4)+line([[x+8,938],[x+8,950]],4)+line([[x+40,934],[x+42,948]],4));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const arm=(x1,y1,x2,y2,sh)=>part(capsule(x1,y1,38,x2,y2,34),sh?K.sSh:K.s,fill(ellipse((x1+x2)/2,(y1+y2)/2,8,6),K.spot,'opacity=".8"'))+part(ellipse(x2,y2+14,46,34),sh?K.sSh:K.s,line([[x2-18,y2+30],[x2-18,y2+44]],4)+line([[x2+2,y2+34],[x2+2,y2+48]],4)+line([[x2+22,y2+30],[x2+24,y2+44]],4));
 P['arm-far']={svg:arm(424,650,394,730,true),pivot:[424,640]};
 P['arm-near']={svg:arm(594,650,632,732,false),pivot:[594,640],hand:[642,754]};
 // body: big dome shell on the back, yellow chest in front
 const shell=sm([[262,720],[282,610],[360,530],[470,496],[580,520],[646,590],[672,690],[650,800],[570,866],[460,884],[340,850],[280,800]],18);
 const plates=[[[360,540],[400,640]],[[470,498],[470,640]],[[580,520],[540,640]],[[282,640],[400,690]],[[672,690],[560,700]],[[290,790],[420,740]],[[640,790],[540,750]],[[400,640],[470,640]],[[470,640],[540,640]],[[400,690],[420,740]],[[540,700],[540,750]]].map(([a,b])=>line([a,b],6,INK,'opacity=".55"')).join('');
 const pawE=fill(ellipse(460,730,44,34),K.stDk)+fill(ellipse(404,672,14,18),K.stDk)+fill(ellipse(448,648,14,18),K.stDk)+fill(ellipse(494,650,14,18),K.stDk)+fill(ellipse(534,688,14,18),K.stDk);
 const chest=sm([[560,610],[640,640],[664,740],[640,830],[580,872],[530,860],[524,740]],12);
 P.body={svg:part(shell,K.st,fill(sm([[262,720],[330,740],[340,850],[280,800]],8),K.stSh,'opacity=".6"')+plates+fill(ellipse(470,560,80,30,40,.2),K.stHi,'opacity=".6"')+pawE+hatch(320,780,3,{ang:-70,op:.3}))+part(chest,K.sHi,fill(ellipse(600,800,50,40),K.sSh,'opacity=".5"')+line([[540,700],[640,704]],4,INK,'opacity=".3"')+line([[540,760],[650,764]],4,INK,'opacity=".3"'))+part(sm([[330,846],[560,860],[640,880],[505,894],[380,884]],10),K.sSh,''),pivot:[505,862],neck:[505,580]};
 // small head on a short neck, drowsy eyes
 const headC=sm([[560,320],[650,330],[716,390],[740,460],[716,530],[664,566],[600,600],[520,604],[480,560],[470,480],[490,400],[520,340]],20);
 P.head={svg:part(headC,K.s,fill(ellipse(500,470,40,110),K.sSh,'opacity=".7"')+fill(ellipse(620,370,70,34,72,.3),K.sHi,'opacity=".7"')+fill(ellipse(560,350,14,10),K.spot,'opacity=".8"')+fill(ellipse(500,420,12,9),K.spot,'opacity=".8"')+fill(ellipse(540,520,36,20),K.pink,'opacity=".8"')+fill(ellipse(704,520,20,12),K.pink,'opacity=".8"')),pivot:[515,585]};
 const lid=(x,y,s=1)=>fill(ellipse(x,y,20*s,26*s),INK)+fill(ellipse(x+6,y-8,7*s,8*s),'#fff')+fill(sm([[x-26*s,y-30*s],[x+26*s,y-30*s],[x+26*s,y-4*s],[x-26*s,y-4*s]],4),K.s)+line([[x-24*s,y-4*s],[x+24*s,y-2*s]],6);
 const f=face({browColor:K.stDk,eyeL:[552,448],eyeR:[664,444],nose:[722,490],mouth:[690,520],browY:396});f.eyes.variants.open=lid(552,448,.92)+lid(664,444,1);f.eyes.variants.focus=lid(552,454,.9)+lid(664,450,1);Object.assign(P,f);
 return P;
}
