// Rig-ready layered art for 赤焰小狐 (Ember Fox), drawn as vector parts in one
// shared 1000x1000 canvas (feet on y≈948). Each joint is hidden by design:
// limbs end in round caps that rotate into themselves, leg tops tuck under
// the body, ear bases tuck behind the head, the scarf covers the neck.
import {catmull,d,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun} from './geom.mjs';
export const C={ink:'#2a1a12',or:'#f5832c',orSh:'#d9621f',orHi:'#ffa451',cr:'#fff4e2',crSh:'#ecd3b2',dk:'#3b241a',dkHi:'#6a4634',pink:'#f59b97',gold:'#f6c330',goldSh:'#c7860f',steel:'#e6eaf0',steelSh:'#a8b1be',steelHi:'#ffffff',sc:'#ffffff',scSh:'#d2d2d2',mouth:'#7a2a20'};
const W=9;let uid=0;const id=p=>p+(++uid);
export const fill=(poly,color,extra='')=>`<path d="${d(poly)}" fill="${color}" ${extra}/>`;
export const line=(pts,w=W,color=C.ink,extra='')=>`<path d="${d(pts,false)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const curve=(pts,w=W,color=C.ink,extra='')=>line(catmull(pts,false,10),w,color,extra);
const outline=(poly,w=W)=>`<path d="${d(poly)}" fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round"/>`;
const clip=(poly,inner)=>{const c=id('c');return `<clipPath id="${c}"><path d="${d(poly)}"/></clipPath><g clip-path="url(#${c})">${inner}</g>`;};
const hatch=(x,y,n,{dx=13,len=20,ang=-62,w=3.2,op=.45}={})=>{let s='';const a=ang*Math.PI/180;for(let i=0;i<n;i++){const X=x+i*dx,Y=y+i*dx*.18;s+=line([[X,Y],[X+Math.cos(a)*len,Y+Math.sin(a)*len]],w,C.ink,`opacity="${op}"`);}return s;};
const part=(contour,base,details='',w=W)=>fill(contour,base)+clip(contour,details)+outline(contour,w);
const sm=(pts,per=14)=>catmull(pts,true,per);

// ============================ FRONT 3/4 (facing right) =====================
export function front(){
 const P={};
 // tail: big brush, base tucked behind the hip, tip curling up
 const tr=ribbon([[468,826],[380,846],[290,826],[214,760],[184,660],[196,566],[248,500]],[20,52,84,100,96,70,6]);
 const tail=tuftsAt(tr.contour,[...tuftRun([360,898],[180,770],5,80,34,.3),...tuftRun([150,720],[170,560],3,72,30,.3),[[214,520],60,22,.3],...tuftRun([300,770],[268,690],2,60,20,-.3)]);
 const tip=tuftsAt(sm([[120,640],[200,600],[284,640],[300,520],[250,470],[160,520]],10),[...tuftRun([140,660],[280,650],4,56,22,-.3)]);
 P.tail={svg:part(tail,C.or,fill(ellipse(320,830,150,64,72,-.25),C.orSh)+fill(tip,C.cr)+hatch(318,800,4,{ang:-35})+curve([[236,730],[222,690]],3.5,C.ink,'opacity=".4"')+curve([[270,770],[250,740]],3.5,C.ink,'opacity=".4"')),
  bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 // legs: soft stumps; top hidden under the body, dark boot at the bottom
 const leg=(x,shade)=>{const c=sm([[x-36,740],[x+36,740],[x+40,860],[x+52,912],[x+48,946],[x-32,948],[x-46,926],[x-40,860]],12);
  const boot=sm([[x-48,896],[x+30,888],[x+60,912],[x+50,952],[x-36,954],[x-50,930]],10);
  return part(c,shade?C.orSh:C.or,fill(boot,C.dk)+curve([[x-44,900],[x-10,892],[x+36,894]],6)+line([[x+12,926],[x+13,948]],4)+line([[x+32,922],[x+35,944]],4)+(shade?'':hatch(x-26,800,2,{ang:-70,op:.3})));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};
 P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 // far arm (behind the body)
 P['arm-far']={svg:part(capsule(424,640,30,392,722,27),C.orSh)+part(ellipse(384,752,38,36),C.dk,fill(ellipse(372,740,10,7),C.dkHi)),pivot:[424,640]};
 // body: small bean with a cream belly
 const bodyC=tufts(sm([[432,572],[505,558],[584,572],[622,650],[630,760],[598,846],[505,878],[418,860],[384,770],[394,652]],16),[...clumps(.15,.42,4,40,10,.5,7),...clumps(.62,.9,3,40,9,-.5,8)]);
 const belly=tufts(sm([[505,598],[584,604],[612,690],[606,792],[566,856],[502,866],[480,790],[478,682]],12),clumps(.62,.98,5,34,11,-.4,9));
 P.body={svg:part(bodyC,C.or,fill(ellipse(392,760,82,150),C.orSh)+fill(belly,C.cr)+fill(ellipse(566,826,56,38),C.crSh)+curve([[520,700],[534,712]],3.5,C.ink,'opacity=".4"')+curve([[552,762],[566,772]],3.5,C.ink,'opacity=".4"')+hatch(402,700,3,{ang:-75,op:.35})),
  pivot:[505,862],neck:[505,580]};
 // scarf tail (white base, dyed by slot colour) flowing back over the shoulder
 const sr=ribbon([[480,592],[420,598],[360,580],[306,548],[256,540],[212,512]],[30,32,32,30,27,24]);
 P['scarf-tail']={svg:part(sr.contour,C.sc,fill(ribbon([[440,610],[380,604],[326,578],[276,562],[226,532]],[10,12,12,10,8]).contour,C.scSh)+curve([[430,590],[370,578],[322,552]],3.5,C.ink,'opacity=".45"')+curve([[292,560],[246,544]],3.5,C.ink,'opacity=".45"')),
  bones:[['scarf',[478,590]],['scarf-mid',[350,578]],['scarf-tip',[222,520]]]};
 // ears (behind head)
 const ear=(pts,inner,tipPts,col,seed)=>part(tufts(sm(pts,14),clumps(.0,.3,2,30,9,.5,seed)),col,fill(tufts(sm(inner,12),clumps(.0,1,6,26,8,.3,seed+1)),C.cr)+fill(sm(tipPts,6),C.dk));
 P['ear-far']={svg:ear([[372,330],[342,222],[326,100],[390,148],[470,262]],[[388,300],[362,214],[352,146],[392,184],[446,262]],[[290,50],[430,50],[404,168],[352,176],[300,172]],C.orSh,11),pivot:[420,290]};
 P['ear-near']={svg:ear([[572,268],[642,160],[730,66],[744,174],[702,298]],[[600,262],[654,184],[718,114],[724,182],[688,276]],[[690,20],[800,20],[772,150],[730,152],[690,132]],C.or,13),pivot:[642,290]};
 // head: wide round, cheek fluff, forehead tuft
 const headC=tuftsAt(sm([[515,224],[640,240],[730,312],[760,420],[740,512],[652,572],[520,592],[396,568],[300,502],[284,400],[320,300],[410,238]],20),
  [[[488,226],44,18,-.5],[[530,222],40,16,.5],...tuftRun([292,420],[384,566],4,70,34,-.3),...tuftRun([764,424],[714,546],3,66,32,.3),[[660,568],54,20,.3],[[316,320],56,18,-.3],[[300,370],56,18,-.3]]);
 const mask=tuftsAt(sm([[372,470],[450,452],[548,474],[640,456],[756,444],[742,514],[652,572],[520,590],[400,564],[330,508]],12),[...tuftRun([352,486],[440,456],3,40,14,.5)]);
 P.head={svg:part(headC,C.or,fill(ellipse(330,380,120,210),C.orSh)+fill(ellipse(642,300,90,48,72,.3),C.orHi,'opacity=".55"')+fill(mask,C.cr)+fill(ellipse(470,566,96,42),C.crSh)+fill(ellipse(452,502,30,17),C.pink,'opacity=".85"')+fill(ellipse(696,496,26,15),C.pink,'opacity=".85"')+hatch(318,360,3,{ang:-70,op:.3})+curve([[600,270],[640,262]],3.5,C.ink,'opacity=".35"')),pivot:[515,585]};
 // face pieces: swapped by face-* animations (track 1)
 const eye=(x,y,s=1)=>fill(ellipse(x,y,19*s,25*s),C.ink)+fill(ellipse(x+6*s,y-9*s,7*s,8*s),'#fff')+fill(ellipse(x-6*s,y+10*s,3.5*s,3.5*s),'#fff','opacity=".8"');
 P.eyes={variants:{open:eye(508,428,.92)+eye(640,422),focus:eye(508,434,.9)+eye(640,428,.98),
  happy:curve([[486,438],[508,414],[530,438]],8)+curve([[616,432],[640,406],[664,432]],8),
  alert:fill(ellipse(508,426,22,29),C.ink)+fill(ellipse(515,415,8,9),'#fff')+fill(ellipse(640,420,24,31),C.ink)+fill(ellipse(647,409,9,10),'#fff'),
  sleep:curve([[486,428],[508,442],[530,428]],7)+curve([[616,422],[640,436],[664,422]],7),
  blink:line([[488,434],[528,434]],7)+line([[618,428],[662,428]],7)},pivot:[574,425]};
 P.brows={variants:{determined:line([[480,382],[530,398]],10)+line([[612,394],[668,376]],10),calm:curve([[482,388],[506,380],[530,386]],7)+curve([[614,382],[640,374],[664,380]],7),
  worried:line([[480,396],[528,382]],8)+line([[614,380],[664,394]],8),none:''},pivot:[574,388]};
 const nose=fill(sm([[690,470],[718,466],[712,486],[700,490]],6),C.ink)+fill(ellipse(700,472,5,3),'#fff','opacity=".7"');
 P.mouth={variants:{smile:nose+curve([[648,502],[664,514],[680,504]],6)+curve([[680,504],[694,514],[708,502]],6)+line([[680,492],[680,504]],5),
  open:nose+part(sm([[650,502],[708,502],[700,538],[679,548],[658,538]],10),C.mouth,fill(ellipse(679,542,18,12),C.pink),6),
  flat:nose+line([[660,508],[700,506]],6)+line([[680,492],[680,506]],5),
  o:nose+part(ellipse(679,514,11,13),C.mouth,'',5)},pivot:[690,500]};
 // scarf wrap + brooch hide the neck seam
 const wrap=sm([[400,560],[505,548],[630,556],[650,594],[612,626],[505,630],[420,614],[386,590]],14);
 P['scarf-wrap']={svg:part(wrap,C.sc,fill(sm([[386,602],[505,614],[644,602],[612,630],[505,636],[420,620]],10),C.scSh)+curve([[430,582],[505,594],[600,586]],3.5,C.ink,'opacity=".4"')),pivot:[505,592]};
 const flame=sm([[540,614],[552,594],[548,572],[564,582],[574,560],[588,590],[582,616],[560,628]],8);
 P.brooch={svg:part(ellipse(560,608,25,25),C.gold,fill(ellipse(566,614,18,14),C.goldSh))+part(flame,'#ff6a2a',fill(sm([[552,614],[560,598],[570,606],[568,620]],6),'#ffd34a'),6),pivot:[560,608]};
 // sword arm (near) + sword
 P['arm-near']={svg:part(capsule(594,640,31,628,724,28),C.or,hatch(596,684,2,{ang:-60,op:.3}))+part(ellipse(642,754,40,38),C.dk,fill(ellipse(630,742,11,8),C.dkHi)),pivot:[594,640],hand:[642,754]};
 P.sword={svg:`<g transform="translate(642 754) rotate(36)">${sword()}</g>`,pivot:[642,754]};
 return P;
}
export function sword(){const blade=sm([[-25,-66],[25,-66],[29,-250],[0,-302],[-29,-250]],4),guard=sm([[-62,-52],[62,-52],[64,-76],[-64,-76]],4),grip=sm([[-15,-52],[15,-52],[15,40],[-15,40]],4);
 return part(grip,'#7b4a2c',line([[-15,-20],[15,-28]],4)+line([[-15,4],[15,-4]],4)+line([[-15,28],[15,20]],4))+part(ellipse(0,52,20,20),C.gold,fill(ellipse(5,58,12,10),C.goldSh))+part(blade,C.steel,fill(sm([[0,-66],[30,-66],[30,-250],[0,-304]],4),C.steelSh)+line([[0,-82],[0,-282]],4,C.steelHi))+part(guard,C.gold,fill(sm([[-64,-62],[64,-62],[64,-76],[-64,-76]],4),C.goldSh));}

// ============================ BACK 3/4 (walking away) =======================
export function back(){
 const P={};const F=front();
 // head from behind: same silhouette, all fur, darker nape, a hint of cheek fluff
 const headC=tuftsAt(sm([[515,224],[640,240],[730,312],[760,420],[740,512],[652,572],[520,592],[396,568],[300,502],[284,400],[320,300],[410,238]],20),
  [[[488,226],44,18,-.3],[[530,222],40,16,.3],...tuftRun([292,420],[384,566],4,70,34,-.3),...tuftRun([764,424],[714,546],3,66,32,.3),[[660,568],54,20,.3],[[316,320],56,18,-.3],[[300,370],56,18,-.3],...tuftRun([440,580],[600,580],3,50,16,0)]);
 const nape=tuftsAt(sm([[420,470],[520,450],[640,470],[680,540],[600,590],[440,590],[370,540]],12),[...tuftRun([420,470],[640,470],4,48,16,0)]);
 P.head={svg:part(headC,C.or,fill(ellipse(360,400,140,210),C.orSh)+fill(ellipse(620,300,110,60,72,.25),C.orHi,'opacity=".5"')+fill(ellipse(515,560,170,50),C.orSh,'opacity=".6"')+hatch(470,380,3,{ang:-80,op:.3})+hatch(600,400,3,{ang:-100,op:.3})+curve([[515,300],[520,360]],3.5,C.ink,'opacity=".35"')),pivot:F.head.pivot};
 const ear=(pts,col)=>part(tuftsAt(sm(pts,14),[]),col,fill(sm(pts.map(([x,y])=>[x,y]).slice(0),14),col)+fill(sm(pts===pts?[[290,40],[440,40],[410,168],[350,176],[290,172]]:[],6),C.dk));
 const earF=[[372,330],[342,222],[326,100],[390,148],[470,262]],earN=[[572,268],[642,160],[730,66],[744,174],[702,298]];
 P['ear-far']={svg:part(sm(earF,14),C.or,fill(sm([[290,40],[440,40],[410,168],[350,176],[290,172]],6),C.dk)+fill(ellipse(400,270,40,60,72,.4),C.orSh)),pivot:F['ear-far'].pivot};
 P['ear-near']={svg:part(sm(earN,14),C.orSh,fill(sm([[690,10],[800,10],[776,150],[730,154],[690,134]],6),C.dk)),pivot:F['ear-near'].pivot};
 // body from behind: no belly, a fluffy rump
 const bodyC=tuftsAt(sm([[432,572],[505,558],[584,572],[622,650],[630,760],[598,846],[505,878],[418,860],[384,770],[394,652]],16),[...tuftRun([400,700],[420,840],3,44,12,-.3),...tuftRun([620,700],[600,830],3,44,12,.3)]);
 P.body={svg:part(bodyC,C.or,fill(ellipse(400,760,90,150),C.orSh)+fill(ellipse(600,700,40,90),C.orHi,'opacity=".5"')+curve([[505,600],[500,700],[506,800]],3.5,C.ink,'opacity=".3"')+hatch(430,660,3,{ang:-80,op:.3})),pivot:F.body.pivot,neck:F.body.neck};
 // scarf from behind: wrap + two tails hanging over the back
 const wrap=sm([[396,566],[505,546],[634,560],[652,596],[612,622],[505,628],[420,616],[384,592]],14);
 P['scarf-wrap']={svg:part(wrap,C.sc,fill(sm([[384,600],[505,612],[648,602],[612,628],[505,634],[420,622]],10),C.scSh)+curve([[420,584],[505,574],[610,586]],3.5,C.ink,'opacity=".4"')),pivot:F['scarf-wrap'].pivot};
 const t1=ribbon([[500,600],[470,650],[452,700],[420,744]],[28,30,30,26]);
 P['scarf-tail']={svg:part(t1.contour,C.sc,fill(ribbon([[492,640],[466,690],[438,736]],[8,10,8]).contour,C.scSh)+curve([[500,620],[476,676]],3.5,C.ink,'opacity=".45"')),bones:[['scarf',[500,604]],['scarf-mid',[466,662]],['scarf-tip',[426,740]]]};
 return P;
}

// Fiery crescent shown for a few frames of the attack (焰刃).
export function slash(){const outer=[],inner=[];for(let i=0;i<=40;i++){const a=(-120+i*150/40)*Math.PI/180;outer.push([700+Math.cos(a)*250,600+Math.sin(a)*250]);}
 for(let i=40;i>=0;i--){const t=i/40,a=(-120+i*150/40)*Math.PI/180,r=250-60*Math.sin(Math.PI*Math.pow(t,.8));inner.push([700+Math.cos(a)*r+18,600+Math.sin(a)*r]);}
 const c=[...outer,...inner];const core=c.map(([x,y])=>[700+(x-700)*.97,600+(y-600)*.97]);
 return fill(c,'#ff7a1c')+fill(c.map(([x,y],i)=>i<=40?[x,y]:[700+(x-700)*1.08-6,600+(y-600)*1.08]),'#ffd34a')+outline(c,7);}
