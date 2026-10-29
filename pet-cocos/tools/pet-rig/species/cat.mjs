// 芽芽猫 — mint kitten with a sprout on its head and a watering can.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,leaf,INK} from '../kit.mjs';
const K={g:'#a9d98c',gSh:'#84ba66',gHi:'#c6eaa9',cr:'#fff3dc',crSh:'#ecd9b4',pink:'#f6a8a0',dk:'#4f7f3d',tin:'#cfd8dc',tinSh:'#90a4ae',tinHi:'#ffffff',wh:'#fff'};
export function front(){
 const P={};
 const tr=ribbon([[468,826],[380,846],[290,826],[220,770],[196,680],[220,590],[270,540]],[18,44,64,70,62,40,8]);
 const tail=tuftsAt(tr.contour,[...tuftRun([360,898],[190,780],5,76,30,.3),...tuftRun([170,720],[190,580],3,70,28,.3),[[262,520],50,20,.3]]);
 P.tail={svg:part(tail,K.g,fill(ellipse(330,832,140,56,60,-.2),K.gSh)+fill(sm([[170,640],[240,590],[290,640],[270,540],[210,530],[170,580]],10),K.cr)+hatch(300,800,4,{ang:-35})+curve([[236,700],[224,660]],3.5,INK,'opacity=".4"')),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const c=sm([[x-36,740],[x+36,740],[x+40,860],[x+50,910],[x+52,944],[x-32,948],[x-50,924],[x-40,860]],12);return part(c,sh?K.gSh:K.g,fill(ellipse(x+2,930,56,26),K.cr)+line([[x-22,938],[x-20,948]],4)+line([[x+6,934],[x+6,948]],4)+line([[x+30,934],[x+32,946]],4));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const paw=(x,y)=>part(ellipse(x,y,38,35),K.cr,line([[x-10,y+14],[x-10,y+28]],3.5)+line([[x+8,y+16],[x+8,y+31]],3.5));
 P['arm-far']={svg:part(capsule(424,640,28,392,722,25),K.gSh)+paw(384,752),pivot:[424,640]};
 const bodyC=tufts(sm([[432,572],[505,558],[584,572],[622,650],[630,760],[598,846],[505,878],[418,860],[384,770],[394,652]],16),[...clumps(.15,.42,4,38,9,.5,7),...clumps(.62,.9,3,38,8,-.5,8)]);
 const belly=tufts(sm([[505,598],[584,604],[612,690],[606,792],[566,856],[502,866],[480,790],[478,682]],12),clumps(.62,.98,5,30,9,-.4,9));
 P.body={svg:part(bodyC,K.g,fill(ellipse(392,760,80,150),K.gSh)+fill(belly,K.cr)+fill(ellipse(566,826,56,38),K.crSh)+hatch(402,700,3,{ang:-75,op:.35})+curve([[520,700],[534,712]],3.5,INK,'opacity=".35"')),pivot:[505,862],neck:[505,580]};
 const ear=(pts,inner,col)=>part(tufts(sm(pts,14),clumps(0,.3,2,26,8,.5,5)),col,fill(sm(inner,12),K.pink)+fill(sm([[pts[2][0]-30,pts[2][1]+8],[pts[2][0]+30,pts[2][1]+8],[pts[2][0],pts[2][1]+60]],6),K.gSh,'opacity=".6"'));
 P['ear-far']={svg:ear([[372,330],[352,240],[348,150],[418,196],[470,268]],[[388,300],[372,236],[372,186],[410,222],[446,268]],K.gSh),pivot:[420,290]};
 P['ear-near']={svg:ear([[572,268],[632,196],[704,128],[730,206],[702,298]],[[600,262],[646,206],[696,160],[708,214],[688,276]],K.g),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,226],[640,240],[730,312],[764,420],[742,512],[652,574],[520,594],[396,570],[296,506],[280,400],[320,300],[410,240]],20),
  [[[488,228],40,16,-.5],[[530,224],36,14,.5],...tuftRun([288,430],[384,570],4,70,32,-.3),...tuftRun([768,430],[718,548],3,64,30,.3),[[660,570],54,20,.3]]);
 const sprout=line([[517,240],[519,170]],9,INK)+line([[517,240],[519,170]],5,'#4a8a2a')+leaf(519,176,100,34,-150,'#8ed15a','#3f7a37')+leaf(519,176,110,36,-30,'#6fbf3f','#3f7a37');
 P.head={svg:part(headC,K.g,fill(ellipse(332,380,114,200),K.gSh)+fill(ellipse(640,300,90,46,72,.3),K.gHi,'opacity=".6"')+fill(sm([[372,470],[450,454],[548,476],[640,458],[756,448],[742,516],[652,574],[520,592],[400,566],[330,510]],12),K.cr)+fill(ellipse(466,506,40,22),K.pink,'opacity=".8"')+fill(ellipse(700,500,24,14),K.pink,'opacity=".8"')+hatch(318,350,3,{ang:-70,op:.3})+curve([[690,540],[780,520]],3.5,INK,'opacity=".45"')+curve([[690,556],[786,552]],3.5,INK,'opacity=".45"'))+sprout,pivot:[515,585]};
 Object.assign(P,face({noseSvg:fill(sm([[690,468],[718,466],[704,486]],6),K.pink)+line([[704,486],[704,496]],4)}));
 P['arm-near']={svg:part(capsule(594,640,29,628,724,26),K.g,hatch(596,684,2,{ang:-60,op:.3}))+paw(642,754),pivot:[594,640],hand:[642,754]};
 // watering can held at the hand
 const can=part(sm([[-44,-40],[40,-40],[48,30],[-52,30]],6),K.tin,fill(sm([[10,-40],[40,-40],[48,30],[14,30]],6),K.tinSh)+line([[-40,-14],[44,-14]],4,INK,'opacity=".4"'))+part(sm([[40,-14],[110,-70],[122,-52],[48,6]],6),K.tin,'')+part(ellipse(122,-62,12,12),K.tinSh)+curve([[-38,-34],[-20,-100],[30,-100],[44,-34]],8,INK);
 P.sword={svg:`<g transform="translate(650 744) rotate(-8) scale(1.25)">${can}</g>`,pivot:[642,754]};
 return P;
}
