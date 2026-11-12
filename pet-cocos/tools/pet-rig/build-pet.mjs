// Builds a Spine 4.2 skeleton for one pet species on the Ember Fox skeleton/animations.
// usage: node build-pet.mjs <species> <outDir>
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
import {png} from '../ember-fox/render.mjs';import {BONES,SLOTS,WORLD,UNIT,sp} from '../ember-fox/rig.mjs';import {buildAnimations,WALK} from '../ember-fox/anims.mjs';
const species=process.argv[2],out=process.argv[3]||'out-'+species;fs.mkdirSync(out,{recursive:true});const ZOOM=1;
const F=(await import(`./species/${species}.mjs`)).front();
const images={};
async function add(name,svg){const full=png(svg,ZOOM);const img=sharp(full);const {info}=await img.clone().trim({threshold:0}).toBuffer({resolveWithObject:true});
 const left=-info.trimOffsetLeft,top=-info.trimOffsetTop,buf=await sharp(full).extract({left,top,width:info.width,height:info.height}).png().toBuffer();images[name]={buf,left:left/ZOOM,top:top/ZOOM,w:info.width/ZOOM,h:info.height/ZOOM,pw:info.width,ph:info.height};}
const names=[['tail','tail'],['leg-far','leg-far'],['leg-near','leg-near'],['arm-far','arm-far'],['arm-near','arm-near'],['sword','sword'],['body','body'],['head','head'],['ear-far','ear-far'],['ear-near','ear-near'],['scarf-tail','scarf-tail'],['scarf-wrap','scarf-wrap'],['brooch','brooch']];
for(const [n,k] of names)if(F[k]?.svg)await add(n,F[k].svg);
for(const k of ['eyes','brows','mouth'])for(const [v,svg] of Object.entries(F[k].variants))if(svg)await add(k+'-'+v,svg);
const has=n=>!!images[n];
const PAD=4,PAGE_W=2048;let x=PAD,y=PAD,row=0;const order=Object.entries(images).sort((a,b)=>b[1].ph-a[1].ph);
for(const [,im] of order){if(x+im.pw+PAD>PAGE_W){x=PAD;y+=row+PAD;row=0;}im.ax=x;im.ay=y;x+=im.pw+PAD;row=Math.max(row,im.ph);}
let pageH=1;while(pageH<y+row+PAD)pageH*=2;
await sharp({create:{width:PAGE_W,height:pageH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(order.map(([,im])=>({input:im.buf,left:im.ax,top:im.ay}))).png({compressionLevel:9}).toFile(path.join(out,species+'.png'));
fs.writeFileSync(path.join(out,species+'.atlas'),`${species}.png\nsize: ${PAGE_W}, ${pageH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+order.map(([n,im])=>`${n}\nbounds: ${im.ax}, ${im.ay}, ${im.pw}, ${im.ph}\n`).join(''));
const boneIndex=Object.fromEntries(BONES.map(([n],i)=>[n,i]));
const bones=BONES.map(([name,parent])=>{const w=WORLD[name],p=parent?WORLD[parent]:[0,0];return {name,...(parent?{parent}:{}),x:+(w[0]-p[0]).toFixed(3),y:+(w[1]-p[1]).toFixed(3)};});
const center=im=>sp([im.left+im.w/2,im.top+im.h/2]);
const region=(name,bone)=>{const im=images[name],c=center(im),b=WORLD[bone];return {path:name,x:+(c[0]-b[0]).toFixed(2),y:+(c[1]-b[1]).toFixed(2),width:+(im.w*UNIT).toFixed(2),height:+(im.h*UNIT).toFixed(2)};};
function mesh(name,cols,rows,weightFn){const im=images[name],uvs=[],vertices=[],tri=[];
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const u=c/cols,v=r/rows,cx=im.left+u*im.w,cy=im.top+v*im.h,[wx,wy]=sp([cx,cy]);uvs.push(+u.toFixed(5),+v.toFixed(5));
  const ws=weightFn(cx,cy).filter(([,w])=>w>1e-4),sum=ws.reduce((s,[,w])=>s+w,0);vertices.push(ws.length);for(const [bn,w] of ws){const b=WORLD[bn];vertices.push(boneIndex[bn],+(wx-b[0]).toFixed(3),+(wy-b[1]).toFixed(3),+(w/sum).toFixed(4));}}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+1,d=a+cols+1,e=d+1;tri.push(a,d,b,b,d,e);}
 return {type:'mesh',path:name,uvs,triangles:tri,vertices,hull:0,width:+(im.w*UNIT).toFixed(2),height:+(im.h*UNIT).toFixed(2)};}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const canvasOf=n=>BONES.find(b=>b[0]===n)[2];
function chain(names){const pts=names.map(canvasOf);return (x,y)=>{let best=1e9,bu=0;for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy))),d=(x-ax-t*dx)**2+(y-ay-t*dy)**2;if(d<best){best=d;bu=i+t;}}
 const i=Math.min(names.length-2,Math.floor(bu)),t=smooth(bu-i);return [[names[i],1-t],[names[i+1],t]];};}
const leg=side=>(x,y)=>{const t=smooth((y-800)/(896-800));return [['leg-top-'+side,1-t],['ankle-'+side,t]];};
const att={front:{},'scarf-front':{},'sword-front':{}};
const put=(skin,slot,key,a)=>{(att[skin][slot]??={})[key]=a;};
if(has('leg-far'))put('front','leg-left','leg',mesh('leg-far',2,8,leg('left')));if(has('leg-near'))put('front','leg-right','leg',mesh('leg-near',2,8,leg('right')));
if(has('arm-far'))put('front','arm-left','arm',region('arm-far','arm-left'));if(has('arm-near'))put('front','arm-right','arm',region('arm-near','arm-right'));
if(has('tail'))put('front','tail','tail',mesh('tail',10,10,chain(['tail','tail-mid','tail-mid2','tail-tip'])));
put('front','body','body',region('body','back-btm'));put('front','head','head',region('head','head'));
if(has('ear-far'))put('front','ear-left','ear',region('ear-far','ear-left'));if(has('ear-near'))put('front','ear-right','ear',region('ear-near','ear-right'));
if(has('sword')){put('sword-front','weapon','sword',region('sword','weapon'));}
if(has('scarf-wrap'))put('scarf-front','scarf','wrap',region('scarf-wrap','neck'));if(has('brooch'))put('scarf-front','brooch','brooch',region('brooch','neck'));
if(has('scarf-tail'))put('scarf-front','scarf-tail','tail',mesh('scarf-tail',10,3,chain(['scarf','scarf-mid','scarf-tip'])));
for(const k of ['eyes','brows','mouth'])for(const v of Object.keys(F[k].variants))if(images[k+'-'+v])put('front',k,k+'-'+v,region(k+'-'+v,'gaze'));
const SETUP={tail:'tail','leg-left':'leg','leg-right':'leg','arm-left':'arm',body:'body','tail-front':'tail','scarf-tail':'tail','ear-left':'ear','ear-right':'ear',head:'head',eyes:'eyes-open',brows:'brows-calm',mouth:'mouth-smile',scarf:'wrap',brooch:'brooch',weapon:'sword','arm-right':'arm'};
const slots=SLOTS.map(([name,bone])=>({name,bone,attachment:SETUP[name]}));
const skins=[{name:'default',attachments:{}},...[['fox/front','front'],['gear/scarf-front','scarf-front'],['gear/sword-front','sword-front'],['fox/back','front'],['gear/scarf-back','scarf-front'],['gear/sword-back','sword-front']].map(([name,k])=>({name,attachments:att[k]}))];
const animations=buildAnimations();
const json={skeleton:{hash:species+'-v1',spine:'4.2.73',x:-260,y:-10,width:520,height:500,images:'./images/'},bones,slots,skins,events:{'step-left':{},'step-right':{},strike:{}},animations};
fs.writeFileSync(path.join(out,species+'.json'),JSON.stringify(json));
console.log(JSON.stringify({species,images:Object.keys(images).length,page:[PAGE_W,pageH]}));
