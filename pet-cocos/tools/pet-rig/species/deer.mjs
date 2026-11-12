// 铃铛鹿 — spotted fawn with bell antlers.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,INK} from '../kit.mjs';
const K={t:'#cf9158',tSh:'#b0733f',tHi:'#e4b27c',cr:'#fff0d8',crSh:'#ecd3a8',hoof:'#4a2e1e',sp:'#fff7e8',ant:'#d9b88a',antSh:'#b8956a',gold:'#f6c330',goldSh:'#c7860f',red:'#e0473a',pink:'#f2a79c'};
const spots=(list,r=9)=>list.map(([x,y,s=1])=>fill(ellipse(x,y,r*s,r*.8*s,24,.4),K.sp)).join('');
const bell=(x,y)=>part(ellipse(x,y,17,17),K.gold,fill(ellipse(x+4,y+4,11,10),K.goldSh)+line([[x-10,y+4],[x+10,y+4]],3.5),6)+fill(sm([[x-12,y-18],[x,y-6],[x+12,y-18],[x+6,y-30],[x-6,y-30]],6),K.red)+line([[x-12,y-18],[x+12,y-18]],5);
export function front(){
 const P={};
 P.tail={svg:part(sm([[430,820],[360,806],[316,780],[300,830],[350,880],[430,880]],10),K.t,fill(sm([[320,800],[300,832],[340,872],[380,850]],8),K.cr)+hatch(350,840,3,{ang:-40})),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const c=sm([[x-30,740],[x+30,740],[x+30,860],[x+34,900],[x+36,930],[x-26,934],[x-32,900],[x-30,860]],12);const boot=sm([[x-34,896],[x+36,892],[x+42,934],[x+38,952],[x-30,952],[x-36,930]],8);return part(c,sh?K.tSh:K.t,fill(boot,K.hoof)+fill(sm([[x-32,740],[x+30,740],[x+28,830],[x-30,830]],8),sh?K.crSh:K.cr,'opacity=".0"')+spots([[x-6,790],[x+10,830,.8]],6));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const hoof=(x,y)=>part(ellipse(x,y,34,32),K.hoof,fill(ellipse(x-8,y-8,10,7),'#6a4634'));
 P['arm-far']={svg:part(capsule(424,640,24,392,722,21),K.tSh)+hoof(384,752),pivot:[424,640]};
 const bodyC=tufts(sm([[436,572],[505,560],[580,574],[616,650],[624,760],[594,846],[505,878],[420,860],[388,770],[398,652]],16),[...clumps(.15,.42,3,30,7,.5,7),...clumps(.62,.9,3,30,6,-.5,8)]);
 P.body={svg:part(bodyC,K.t,fill(ellipse(396,760,74,150),K.tSh)+fill(sm([[505,600],[584,606],[610,690],[604,792],[566,856],[502,866],[482,790],[480,682]],12),K.cr)+spots([[420,660],[450,720,1.1],[408,790],[436,840,.9],[470,670,.8],[590,640,.8]],10)+hatch(402,700,3,{ang:-75,op:.3})),pivot:[505,862],neck:[505,580]};
 // ears + antlers merged into the ear parts (they sway together)
 const antler=(x,y,dir,seed)=>{const s=dir;return line([[x,y+20],[x+s*14,y-80],[x+s*40,y-160]],26,INK)+line([[x,y+20],[x+s*14,y-80],[x+s*40,y-160]],15,K.ant)+line([[x+s*12,y-74],[x-s*34,y-140]],22,INK)+line([[x+s*12,y-74],[x-s*34,y-140]],12,K.ant)+line([[x+s*30,y-126],[x+s*82,y-160]],20,INK)+line([[x+s*30,y-126],[x+s*82,y-160]],10,K.ant);};
 const earS=(x,y,w,h,flip,c)=>part(sm([[x,y],[x+flip*w*.5,y-h*.6],[x+flip*w,y-h],[x+flip*w*1.1,y-h*.4],[x+flip*w*.8,y+h*.1],[x+flip*w*.3,y+h*.15]],12),c,fill(sm([[x+flip*w*.2,y-h*.05],[x+flip*w*.55,y-h*.55],[x+flip*w*.85,y-h*.7],[x+flip*w*.85,y-h*.2],[x+flip*w*.5,y+h*.05]],10),K.pink));
 P['ear-far']={svg:antler(404,260,-1,1)+bell(372,96)+bell(370,170)+earS(372,300,-130,120,1,K.tSh).replace('','')+'',pivot:[420,290]};
 P['ear-near']={svg:antler(640,260,1,2)+bell(682,96)+bell(724,138)+earS(690,320,150,120,1,K.t),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,228],[636,246],[722,318],[752,420],[732,512],[650,570],[520,590],[400,568],[306,504],[290,400],[326,306],[412,244]],20),
  [[[488,230],30,12,-.5],[[530,228],28,12,.5],...tuftRun([296,430],[384,566],3,60,22,-.3),...tuftRun([756,430],[714,546],3,56,20,.3),[[660,566],44,14,.3]]);
 P.head={svg:part(headC,K.t,fill(ellipse(340,380,100,190),K.tSh,'opacity=".8"')+fill(ellipse(640,300,90,46,72,.3),K.tHi,'opacity=".6"')+fill(sm([[400,470],[470,452],[560,476],[650,458],[752,448],[734,516],[650,570],[520,588],[420,564],[360,510]],12),K.cr)+spots([[470,300,.9],[540,262,.8],[600,320,1],[430,340,.8]],10)+fill(ellipse(466,508,38,20),K.pink,'opacity=".8"')+fill(ellipse(698,500,22,13),K.pink,'opacity=".8"')+hatch(330,350,3,{ang:-70,op:.3})),pivot:[515,585]};
 Object.assign(P,face({noseSvg:fill(sm([[690,466],[722,462],[716,486],[698,490]],6),'#4a2e1e')+fill(ellipse(704,470,5,3),'#fff','opacity=".7"'),browColor:K.tSh}));
 P['arm-near']={svg:part(capsule(594,640,25,628,724,22),K.t)+hoof(642,754),pivot:[594,640],hand:[642,754]};
 return P;
}
