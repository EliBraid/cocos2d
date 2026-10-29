// 团团犬 — cream pup with brown patches, floppy ears, leaf bandana and a wooden sword.
import {part,fill,line,curve,hatch,sm,ribbon,ellipse,tufts,clumps,capsule,tuftsAt,tuftRun,face,leaf,INK,blob} from '../kit.mjs';
const K={cr:'#fff1d6',crSh:'#f0d6a8',crHi:'#fffaf0',br:'#bf7a42',brSh:'#97592c',brDk:'#6b4023',pink:'#f59b97',gr:'#7dbb4d',grSh:'#5a9a38',grHi:'#a6d56e',wood:'#c8924f',woodSh:'#9a6a35'};
export const NAME='dog';
export function front(){
 const P={};
 // tail: short plume curling over the back
 const tr=ribbon([[470,830],[390,850],[316,826],[262,764],[246,690],[262,630]],[20,46,64,60,44,10]);
 const tail=tuftsAt(tr.contour,[...tuftRun([380,900],[250,780],4,70,26,.3),...tuftRun([234,730],[250,630],3,60,24,.3),[[270,610],52,20,.3]]);
 P.tail={svg:part(tail,K.cr,fill(sm([[240,690],[286,640],[300,700],[270,770],[236,760]],10),K.br)+fill(ellipse(330,846,110,44,60,-.2),K.crSh)+hatch(300,820,4,{ang:-35})+curve([[254,720],[270,672]],3.5,INK,'opacity=".4"')),
  bones:[['tail',[462,826]],['tail-mid',[290,826]],['tail-mid2',[190,700]],['tail-tip',[214,540]]]};
 // legs: cream stumps with round paws
 const leg=(x,sh)=>{const c=sm([[x-36,740],[x+36,740],[x+40,860],[x+50,910],[x+52,944],[x-32,948],[x-50,924],[x-40,860]],12);
  return part(c,sh?K.crSh:K.cr,fill(ellipse(x+2,930,56,26),sh?K.crSh:K.crHi)+curve([[x-26,938],[x-24,948]],4)+line([[x+4,934],[x+4,948]],4)+line([[x+30,934],[x+32,946]],4)+hatch(x-20,790,2,{ang:-70,op:.25}));};
 P['leg-far']={svg:leg(448,true),pivot:[452,930],hip:[452,780]};
 P['leg-near']={svg:leg(556,false),pivot:[560,930],hip:[560,780]};
 const paw=(x,y,sh)=>part(ellipse(x,y,40,37),sh?K.crSh:K.cr,line([[x-12,y+14],[x-12,y+30]],3.5)+line([[x+4,y+16],[x+4,y+33]],3.5)+line([[x+20,y+12],[x+22,y+28]],3.5));
 P['arm-far']={svg:part(capsule(424,640,30,392,722,27),K.crSh,fill(ellipse(410,670,30,40),K.brSh,'opacity=".8"'))+paw(384,752,true),pivot:[424,640]};
 // body
 const bodyC=tufts(sm([[432,572],[505,558],[584,572],[622,650],[630,760],[598,846],[505,878],[418,860],[384,770],[394,652]],16),[...clumps(.15,.42,4,40,10,.5,7),...clumps(.62,.9,3,40,9,-.5,8)]);
 P.body={svg:part(bodyC,K.cr,fill(ellipse(404,740,74,130),K.br)+fill(ellipse(440,640,70,70),K.brSh,'opacity=".6"')+fill(ellipse(560,810,60,48),K.crSh,'opacity=".7"')+fill(ellipse(540,740,68,100),K.crHi)+curve([[520,700],[534,712]],3.5,INK,'opacity=".35"')+hatch(398,690,3,{ang:-75,op:.35})),pivot:[505,862],neck:[505,580]};
 // bandana tail (leaf strip) + wrap
 const sr=ribbon([[480,592],[420,602],[366,590],[318,566]],[28,30,28,20]);
 P['scarf-tail']={svg:part(sr.contour,K.gr,fill(ribbon([[450,606],[390,604],[340,584]],[8,10,8]).contour,K.grSh)+curve([[430,596],[372,584],[330,566]],3.5,'#3f7a37','opacity=".8"')),bones:[['scarf',[478,590]],['scarf-mid',[350,578]],['scarf-tip',[222,520]]]};
 // ears: big floppy brown, hanging behind the head
 const ear=(pts,seed,col,sh)=>{const c=tufts(sm(pts,14),clumps(0,.6,4,36,10,.4,seed));return part(c,col,fill(ellipse(pts[2][0],pts[2][1]+20,44,100,60,.1),sh,'opacity=".7"')+hatch(pts[1][0]-20,pts[1][1]+40,3,{ang:-80,op:.4}));};
 P['ear-far']={svg:ear([[450,250],[360,226],[270,284],[216,396],[222,512],[282,574],[352,544],[402,430],[440,330]],11,K.brSh,K.brDk),pivot:[420,290]};
 P['ear-near']={svg:ear([[600,246],[700,236],[790,296],[834,420],[824,522],[762,574],[700,524],[660,400],[610,320]],13,K.br,K.brSh),pivot:[642,290]};
 // head
 const headC=tuftsAt(sm([[515,224],[640,240],[730,312],[760,420],[740,512],[652,572],[520,592],[396,568],[300,502],[284,400],[320,300],[410,238]],20),
  [[[488,226],44,22,-.5],[[530,218],40,20,.5],[[450,230],36,16,-.4],...tuftRun([292,420],[384,566],4,70,30,-.3),...tuftRun([764,424],[714,546],3,66,28,.3),[[660,568],54,18,.3]]);
 P.head={svg:part(headC,K.cr,fill(ellipse(346,380,110,200),K.crSh,'opacity=".7"')+fill(sm([[560,236],[700,262],[752,360],[700,420],[620,400],[560,330]],12),K.br)+fill(sm([[400,300],[470,250],[520,300],[470,360],[410,350]],10),K.br,'opacity=".9"')
   +fill(ellipse(640,508,120,70),K.crHi)+fill(ellipse(470,520,40,22),K.pink,'opacity=".8"')+fill(ellipse(706,484,22,13),K.pink,'opacity=".7"')+hatch(330,360,3,{ang:-70,op:.3})),pivot:[515,585]};
 Object.assign(P,face({eyeL:[508,428],eyeR:[640,422],nose:[704,468],mouth:[672,508],browColor:K.brDk}));
 // bandana wrap
 const wrap=sm([[400,560],[505,548],[630,556],[650,594],[612,626],[505,672],[420,614],[386,590]],14);
 P['scarf-wrap']={svg:part(wrap,K.gr,fill(sm([[386,602],[505,616],[644,602],[612,630],[505,676],[420,620]],10),K.grSh)+curve([[430,582],[505,596],[600,586]],3.5,'#3f7a37','opacity=".6"')),pivot:[505,592]};
 P['arm-near']={svg:part(capsule(594,640,31,628,724,28),K.cr,fill(ellipse(600,690,24,44),K.br,'opacity=".9"')+hatch(596,684,2,{ang:-60,op:.3}))+paw(642,754,false),pivot:[594,640],hand:[642,754]};
 P.sword={svg:`<g transform="translate(642 754) rotate(36)">${wood()}</g>`,pivot:[642,754]};
 return P;
}
function wood(){const blade=sm([[-25,-66],[25,-66],[29,-240],[0,-290],[-29,-240]],4),guard=sm([[-56,-52],[56,-52],[58,-74],[-58,-74]],4),grip=sm([[-14,-52],[14,-52],[14,40],[-14,40]],4);
 return part(grip,K.woodSh,line([[-14,-20],[14,-28]],4)+line([[-14,4],[14,-4]],4))+part(ellipse(0,52,19,19),K.brDk)+part(blade,K.wood,fill(sm([[0,-66],[29,-66],[29,-240],[0,-290]],4),K.woodSh,'opacity=".7"')+line([[-6,-90],[-6,-230]],4,INK,'opacity=".35"')+line([[10,-130],[10,-200]],3.5,INK,'opacity=".3"'))+part(guard,K.brDk);}
