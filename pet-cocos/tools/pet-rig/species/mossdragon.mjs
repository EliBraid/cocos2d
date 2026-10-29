// 苔藓龙 — mossy baby dragon. Horns act as ears, a small leaf wing rides the scarf-tail slot.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,leaf,INK} from '../kit.mjs';
const K={g:'#8ec95a',gSh:'#6ba63c',gHi:'#b3e07e',dk:'#4b8a2e',cr:'#f7efc4',crSh:'#e3d494',horn:'#f0e0b0',hornSh:'#c9b070',fl:'#fff',flc:'#ffd34a',pink:'#f2a79c',wing:'#c9e6a0',wingSh:'#9ccc6a'};
const moss=(pts)=>pts.map(([x,y,s=1])=>fill(sm([[x-18*s,y],[x-8*s,y-14*s],[x+8*s,y-16*s],[x+20*s,y-2*s],[x+10*s,y+12*s],[x-8*s,y+14*s]],6),K.dk,'opacity=".85"')+fill(ellipse(x+2*s,y-3*s,6*s,6*s),K.fl)+fill(ellipse(x+2*s,y-3*s,2.5*s,2.5*s),K.flc)).join('');
export function front(){
 const P={};
 // long tail ending in a leaf
 const tr=ribbon([[468,826],[380,850],[290,830],[220,770],[190,690],[200,610],[240,560]],[22,50,60,52,40,28,6]);
 const spikes=tuftsAt(tr.contour,[...tuftRun([360,900],[200,780],4,60,20,.3)]);
 P.tail={svg:part(spikes,K.g,fill(ellipse(330,834,130,48,60,-.2),K.gSh)+fill(sm([[300,846],[400,830],[430,870],[330,880]],8),K.cr,'opacity=".9"')+moss([[260,790],[222,720,.9],[330,830,.8],[196,650,.8]])+hatch(290,810,3,{ang:-35}))+leaf(236,590,130,44,-100,'#7cc24a','#3f7a37'),bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 const leg=(x,sh)=>{const c=sm([[x-38,740],[x+38,740],[x+42,860],[x+52,912],[x+54,944],[x-34,948],[x-52,924],[x-42,860]],12);return part(c,sh?K.gSh:K.g,fill(ellipse(x+4,930,60,26),sh?K.gSh:K.gHi)+line([[x-22,938],[x-20,948]],4)+line([[x+6,936],[x+6,948]],4)+line([[x+32,934],[x+34,946]],4)+moss([[x-10,790,.7]]));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const claw=(x,y,c)=>part(ellipse(x,y,38,35),c,line([[x-10,y+14],[x-10,y+30]],3.5)+line([[x+6,y+16],[x+6,y+33]],3.5)+line([[x+22,y+12],[x+24,y+28]],3.5));
 P['arm-far']={svg:part(capsule(424,640,28,392,722,25),K.gSh)+claw(384,752,K.gSh),pivot:[424,640]};
 P['arm-near']={svg:part(capsule(594,640,29,628,724,26),K.g,moss([[600,690,.6]]))+claw(642,754,K.g),pivot:[594,640],hand:[642,754]};
 const bodyC=tufts(sm([[432,572],[505,558],[584,572],[622,650],[634,760],[602,846],[505,880],[414,860],[380,770],[392,652]],16),[...clumps(.15,.42,3,36,9,.5,7),...clumps(.62,.9,3,36,8,-.5,8)]);
 P.body={svg:part(bodyC,K.g,fill(ellipse(396,750,80,140),K.gSh)+fill(sm([[505,600],[584,606],[612,690],[606,792],[566,856],[502,868],[480,790],[478,682]],12),K.cr)+[0,1,2,3,4].map(i=>line([[484,640+i*44],[590,636+i*44]],4,INK,'opacity=".3"')).join('')+moss([[420,640,1],[410,740,1.1],[440,830,.9],[600,610,.7]])+hatch(402,700,3,{ang:-75,op:.3})),pivot:[505,862],neck:[505,580]};
 // little leaf wing behind the shoulder (rides the scarf-tail bones so it flaps)
 P['scarf-tail']={svg:part(sm([[470,620],[420,560],[340,520],[300,560],[330,610],[300,650],[390,664]],10),K.wing,fill(sm([[420,600],[350,560],[320,584],[350,614],[330,640],[400,650]],8),K.wingSh,'opacity=".8"')+line([[470,624],[330,560]],4,INK,'opacity=".5"')+line([[460,636],[310,640]],4,INK,'opacity=".5"')),bones:[['scarf',[478,590]],['scarf-mid',[350,578]],['scarf-tip',[222,520]]]};
 // horns (ear slots) with a leaf frill
 const horn=(x,y,h,w,ang,flip)=>{const a=ang*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),Pn=(u,v)=>[x+u*ca-v*sa,y+u*sa+v*ca];return part(sm([Pn(0,-w),Pn(h*.5,-w*.7),Pn(h,0),Pn(h*.5,w*.5),Pn(0,w)],8),K.horn,fill(sm([Pn(h*.3,0),Pn(h,0),Pn(h*.5,w*.5),Pn(0,w)],6),K.hornSh,'opacity=".8"'),7);};
 P['ear-far']={svg:leaf(400,300,130,40,-140,'#79c040','#3f7a37')+horn(420,290,150,36,-112),pivot:[420,290]};
 P['ear-near']={svg:leaf(640,290,130,40,-40,'#79c040','#3f7a37')+horn(650,280,170,38,-76)+fill(ellipse(700,150,0,0),K.g),pivot:[642,290]};
 const headC=tuftsAt(sm([[515,226],[640,240],[730,312],[764,424],[744,518],[656,574],[522,594],[394,570],[298,506],[282,402],[318,302],[412,240]],20),
  [[[488,228],34,12,-.5],[[530,224],30,12,.5],...tuftRun([290,430],[384,568],3,56,18,-.3),[[660,570],44,14,.3]]);
 P.head={svg:part(headC,K.g,fill(ellipse(336,382,110,200),K.gSh,'opacity=".85"')+fill(ellipse(640,300,90,46,72,.3),K.gHi,'opacity=".7"')+fill(sm([[400,480],[470,456],[560,478],[650,462],[760,456],[744,520],[656,574],[522,592],[420,566],[360,512]],12),K.cr)+moss([[420,280,1.1],[520,252,.9],[360,380,1],[590,262,.8]])+fill(ellipse(466,510,40,22),K.pink,'opacity=".8"')+fill(ellipse(704,500,24,14),K.pink,'opacity=".7"')+hatch(330,350,3,{ang:-70,op:.3})),pivot:[515,585]};
 Object.assign(P,face({nose:[708,470],noseSvg:fill(ellipse(700,468,6,4),INK)+fill(ellipse(724,476,6,4),INK),browColor:K.dk}));
 return P;
}
