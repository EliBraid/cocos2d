import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const root=fileURLToPath(new URL('../',import.meta.url)),src=path.join(root,'source-assets/fox-v05'),images=path.join(src,'images');await fs.mkdir(images,{recursive:true});
const W=1280,H=1280,N=W*H,load=async name=>(await sharp(path.join(src,name)).resize(W,H,{fit:'fill'}).ensureAlpha().raw().toBuffer());
const original=await load('canonical.png'),blank=await load('blank-face-plate.png'),repair=await load('torso-repair-plate.png'),neutral=await load('neutral-scarf-plate.png');
const definitions=[
 ['tail',[[40,735],[200,700],[375,744],[453,840],[548,960],[540,1050],[487,1125],[333,1154],[145,1120],[67,1035],[35,890]],[275,940]],
 ['weapon',[[1190,488],[1248,510],[1232,620],[1186,710],[1077,820],[1120,845],[1128,890],[1085,904],[1056,880],[1010,944],[986,966],[946,949],[935,920],[958,874],[921,856],[929,812],[971,780],[1015,800]],[1110,720]],
 ['leg-left',[[528,955],[683,984],[647,1080],[590,1142],[565,1195],[426,1204],[389,1160],[441,1084],[470,1014]],[525,1100]],
 ['leg-right',[[752,947],[870,955],[913,1062],[965,1165],[915,1189],[809,1170],[777,1103],[747,1040]],[846,1082]],
 ['arm-right',[[825,770],[916,794],[1015,807],[1060,854],[1045,913],[982,944],[909,917],[835,870]],[943,863]],
 ['torso',[[530,736],[794,714],[864,783],[882,907],[829,976],[754,1037],[653,1057],[570,1023],[478,976],[451,870],[482,778]],[683,898]],
 ['arm-left',[[466,791],[548,793],[600,839],[624,917],[592,961],[523,973],[475,934],[426,867]],[523,881]],
 ['scarf',[[163,607],[330,581],[457,628],[574,690],[778,690],[899,696],[912,776],[861,820],[736,814],[620,775],[522,775],[447,809],[328,788],[215,718]],[548,724]],
 ['head',[[318,70],[550,108],[657,286],[748,261],[969,120],[1008,341],[977,508],[1003,610],[932,685],[844,716],[655,720],[505,687],[402,650],[324,603],[300,480],[326,300]],[656,433]],
 ['brooch',[[805,676],[846,678],[876,713],[898,751],[878,792],[840,810],[793,791],[778,751]],[831,750]],
];
const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const labels=new Int16Array(N);labels.fill(-1);const masks=definitions.map(()=>new Uint8Array(N));
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;if(original[p*4+3]<3)continue;let at=-1;for(let i=0;i<definitions.length;i++)if(inside(x,y,definitions[i][1]))at=i;if(at<0){let score=Infinity;definitions.forEach((d,i)=>{const distance=(x-d[2][0])**2+(y-d[2][1])**2;if(distance<score){score=distance;at=i;}});}labels[p]=at;masks[at][p]=255;}
// The badge flame keeps its own red. Loose red fabric around it belongs to
// the dyeable scarf, including pixels outside the hand-drawn crop polygon.
for(let y=580;y<825;y++)for(let x=130;x<930;x++){const p=y*W+x,k=p*4,old=labels[p];if(old<0||definitions[old][0]==='head'||(x>790&&x<885&&y>695&&y<800))continue;if(original[k]>90&&original[k]>original[k+1]*2.6&&original[k]>original[k+2]*2.4){masks[old][p]=0;labels[p]=7;masks[7][p]=255;}}
function featureMask(box){const [x0,y0,x1,y1]=box,m=new Uint8Array(N),outside=new Uint8Array(N),queue=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=y*W+x,k=p*4;if(Math.max(original[k],original[k+1],original[k+2])<125)m[p]=255;}
 const push=p=>{if(!m[p]&&!outside[p]){outside[p]=1;queue.push(p);}};for(let x=x0;x<=x1;x++){push(y0*W+x);push(y1*W+x);}for(let y=y0;y<=y1;y++){push(y*W+x0);push(y*W+x1);}for(let c=0;c<queue.length;c++){const p=queue[c],x=p%W,y=Math.floor(p/W);if(x>x0)push(p-1);if(x<x1)push(p+1);if(y>y0)push(p-W);if(y<y1)push(p+W);}for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!outside[y*W+x])m[y*W+x]=255;const expanded=m.slice();for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(m[y*W+x])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)expanded[(y+dy)*W+x+dx]=255;return expanded;}
const featureBoxes={'eye-left':[624,503,709,596],'eye-right':[811,496,890,582],'brow-left':[615,460,697,502],'brow-right':[814,454,883,495],'nose':[776,558,831,595],'mouth':[722,591,820,642]};
const features=Object.entries(featureBoxes).map(([name,box])=>({name,mask:featureMask(box)}));const headRaw=Buffer.from(original);for(const {mask} of features)for(let p=0;p<N;p++)if(mask[p]){const k=p*4;headRaw[k]=blank[k];headRaw[k+1]=blank[k+1];headRaw[k+2]=blank[k+2];}
const manifest=[];
async function savePart(name,data,mask){const rgba=Buffer.alloc(N*4);let x0=W,y0=H,x1=-1,y1=-1;for(let p=0;p<N;p++)if(mask[p]&&data[p*4+3]>2){const x=p%W,y=Math.floor(p/W),k=p*4;rgba[k]=data[k];rgba[k+1]=data[k+1];rgba[k+2]=data[k+2];rgba[k+3]=Math.round(data[k+3]*mask[p]/255);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('Missing registered layer '+name);x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(W-1,x1+2);y1=Math.min(H-1,y1+2);const bounds={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};await sharp(rgba,{raw:{width:W,height:H,channels:4}}).extract(bounds).png().toFile(path.join(images,name+'.png'));manifest.push({name,...bounds,canvas:[W,H]});return rgba;}
const allParts=[];for(let i=0;i<definitions.length;i++){const name=definitions[i][0],m=masks[i].slice();let data=original;
 if(name==='head')data=headRaw;
 if(name==='torso'){data=Buffer.from(original);for(let y=690;y<1030;y++)for(let x=450;x<890;x++){const p=y*W+x,k=p*4;if(inside(x,y,definitions[i][1])&&labels[p]>=0&&['head','scarf','arm-left','arm-right','brooch'].includes(definitions[labels[p]][0])&&repair[k+3]>180){m[p]=255;data[k]=repair[k];data[k+1]=repair[k+1];data[k+2]=repair[k+2];data[k+3]=original[k+3];}}}
 if(name==='scarf'){data=Buffer.from(original);for(let p=0;p<N;p++)if(m[p]&&Math.max(original[p*4],original[p*4+1],original[p*4+2])>70){const k=p*4;data[k]=neutral[k];data[k+1]=neutral[k+1];data[k+2]=neutral[k+2];}}
 if(name.startsWith('leg-')){data=Buffer.from(original);const [cx,cy]=name==='leg-left'?[586,972]:[780,970];for(let y=cy-45;y<cy+40;y++)for(let x=cx-55;x<cx+55;x++){const p=y*W+x;if((x-cx)**2+(y-cy)**2<50**2&&labels[p]===5){m[p]=255;}}}
 allParts.push({name,data:await savePart(name,data,m)});
}
for(const f of features)allParts.push({name:f.name,data:await savePart(f.name,original,f.mask)});
const expr=await sharp(path.join(src,'expression-features.png')).metadata(),cw=Math.floor(expr.width/2),ch=Math.floor(expr.height/2);
async function cell(name,col,row,half=null){let im=sharp(path.join(src,'expression-features.png')).extract({left:col*cw,top:row*ch,width:cw,height:ch});if(half!==null)im=im.extract({left:half*Math.floor(cw/2),top:0,width:Math.floor(cw/2),height:ch});const b=await im.png().toBuffer();await sharp(b).trim({threshold:12}).png().toFile(path.join(images,name+'.png'));}
await cell('eye-closed-left',0,0,0);await cell('eye-closed-right',0,0,1);await cell('eye-curious-left',1,0,0);await cell('eye-curious-right',1,0,1);await cell('mouth-happy',0,1);await cell('mouth-alert',1,1);
const back=await load('back-canonical.png'),backMask=new Uint8Array(N),backScarf=new Uint8Array(N),backNeutral=Buffer.from(back),scarfBoundary=[[140,540],[350,510],[475,580],[590,600],[730,595],[860,615],[900,650],[885,715],[710,715],[635,785],[585,750],[575,715],[445,740],[300,700],[200,600]];for(let p=0;p<N;p++){const k=p*4;backMask[p]=back[k+3]>2?255:0;const x=p%W,y=Math.floor(p/W);if(inside(x,y,scarfBoundary)&&back[k]>85&&back[k]>back[k+1]*2.8&&back[k]>back[k+2]*2.6){backScarf[p]=255;const light=back[k];backNeutral[k]=backNeutral[k+1]=backNeutral[k+2]=light;}}const expanded=backScarf.slice();for(let y=470;y<820;y++)for(let x=0;x<W;x++)if(backScarf[y*W+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<W)expanded[(y+dy)*W+x+dx]=255;
await savePart('back',back,backMask);await savePart('back-scarf',backNeutral,expanded);
await sharp({create:{width:2,height:2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(path.join(images,'empty.png'));
await fs.writeFile(path.join(src,'registration.json'),JSON.stringify({canvas:{width:W,height:H,origin:[660,1180],unitsPerPixel:.48},layers:manifest,facialFeatures:featureBoxes},null,2));
// The visible ownership map is an exact partition of the approved source.
let opaque=0,unowned=0;for(let p=0;p<N;p++)if(original[p*4+3]>2){opaque++;if(labels[p]<0)unowned++;}await fs.writeFile(path.join(src,'registration-check.json'),JSON.stringify({sourceOpaquePixels:opaque,unownedSourcePixels:unowned,independentLayerScaling:false},null,2));
const registered=[];for(const {name,data} of allParts){const f=path.join(src,'plate-'+name+'.png');await sharp(data,{raw:{width:W,height:H,channels:4}}).png().toFile(f);registered.push(f);}const preview=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(registered.map(input=>({input,left:0,top:0}))).png().toBuffer();await fs.writeFile(path.join(src,'registered-rest.png'),preview);console.log(JSON.stringify({layers:manifest.length,opaque,unowned,canvas:[W,H]}));
