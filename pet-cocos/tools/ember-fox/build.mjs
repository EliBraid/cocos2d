// Builds images -> atlas -> Spine 4.2 JSON for the Ember Fox.
// usage: node tools/ember-fox/build.mjs <outDir> [EmberRig.ts]
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
import {front,back,slash} from './parts.mjs';import {png} from './render.mjs';import {BONES,SLOTS,WORLD,UNIT,sp} from './rig.mjs';import {buildAnimations,WALK} from './anims.mjs';
const out=process.argv[2]||'out';fs.mkdirSync(out,{recursive:true});const ZOOM=1; // texture px per canvas px (2 px per Spine unit)
const F=front(),B=back();
// ---------- 1. render every part on the shared canvas and trim -------------
const images={}; // name -> {buf,left,top,w,h}
async function add(name,svg){const full=png(svg,ZOOM);const img=sharp(full);const {info}=await img.clone().trim({threshold:0}).toBuffer({resolveWithObject:true});
 const left=-info.trimOffsetLeft,top=-info.trimOffsetTop,buf=await sharp(full).extract({left,top,width:info.width,height:info.height}).png().toBuffer();images[name]={buf,left:left/ZOOM,top:top/ZOOM,w:info.width/ZOOM,h:info.height/ZOOM,pw:info.width,ph:info.height};}
const list=[['tail',F.tail.svg],['leg-far',F['leg-far'].svg],['leg-near',F['leg-near'].svg],['arm-far',F['arm-far'].svg],['arm-near',F['arm-near'].svg],['sword',F.sword.svg],
 ['body',F.body.svg],['head',F.head.svg],['ear-far',F['ear-far'].svg],['ear-near',F['ear-near'].svg],['scarf-tail',F['scarf-tail'].svg],['scarf-wrap',F['scarf-wrap'].svg],['brooch',F.brooch.svg],
 ['body-back',B.body.svg],['head-back',B.head.svg],['ear-far-back',B['ear-far'].svg],['ear-near-back',B['ear-near'].svg],['scarf-tail-back',B['scarf-tail'].svg],['scarf-wrap-back',B['scarf-wrap'].svg],['slash',slash()]];
for(const k of ['eyes','brows','mouth'])for(const [v,svg] of Object.entries(F[k].variants))if(svg)list.push([k+'-'+v,svg]);
for(const [n,s] of list)await add(n,s);
// ---------- 2. pack into one atlas page (shelf packer) ----------------------
const PAD=4,PAGE_W=2048;let x=PAD,y=PAD,row=0;const order=Object.entries(images).sort((a,b)=>b[1].ph-a[1].ph);
for(const [,im] of order){if(x+im.pw+PAD>PAGE_W){x=PAD;y+=row+PAD;row=0;}im.ax=x;im.ay=y;x+=im.pw+PAD;row=Math.max(row,im.ph);}
let pageH=1;while(pageH<y+row+PAD)pageH*=2;
await sharp({create:{width:PAGE_W,height:pageH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(order.map(([,im])=>({input:im.buf,left:im.ax,top:im.ay}))).png({compressionLevel:9}).toFile(path.join(out,'ember.png'));
fs.writeFileSync(path.join(out,'ember.atlas'),`ember.png\nsize: ${PAGE_W}, ${pageH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+order.map(([n,im])=>`${n}\nbounds: ${im.ax}, ${im.ay}, ${im.pw}, ${im.ph}\n`).join(''));
// ---------- 3. skeleton ----------------------------------------------------
const boneIndex=Object.fromEntries(BONES.map(([n],i)=>[n,i]));
const bones=BONES.map(([name,parent])=>{const w=WORLD[name],p=parent?WORLD[parent]:[0,0];return {name,...(parent?{parent}:{}),x:+(w[0]-p[0]).toFixed(3),y:+(w[1]-p[1]).toFixed(3)};});
const center=im=>sp([im.left+im.w/2,im.top+im.h/2]);
const region=(name,bone)=>{const im=images[name],c=center(im),b=WORLD[bone];return {path:name,x:+(c[0]-b[0]).toFixed(2),y:+(c[1]-b[1]).toFixed(2),width:+(im.w*UNIT).toFixed(2),height:+(im.h*UNIT).toFixed(2)};};
// weighted grid mesh; weightFn(canvasX,canvasY) -> [[bone,w],...]
function mesh(name,cols,rows,weightFn){const im=images[name],uvs=[],vertices=[],tri=[];
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const u=c/cols,v=r/rows,cx=im.left+u*im.w,cy=im.top+v*im.h,[wx,wy]=sp([cx,cy]);uvs.push(+u.toFixed(5),+v.toFixed(5));
  const ws=weightFn(cx,cy).filter(([,w])=>w>1e-4),sum=ws.reduce((s,[,w])=>s+w,0);vertices.push(ws.length);for(const [bn,w] of ws){const b=WORLD[bn];vertices.push(boneIndex[bn],+(wx-b[0]).toFixed(3),+(wy-b[1]).toFixed(3),+(w/sum).toFixed(4));}}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+1,d=a+cols+1,e=d+1;tri.push(a,d,b,b,d,e);}
 return {type:'mesh',path:name,uvs,triangles:tri,vertices,hull:0,width:+(im.w*UNIT).toFixed(2),height:+(im.h*UNIT).toFixed(2)};}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// chain weights: project onto the polyline through the bones' canvas positions
const canvasOf=n=>BONES.find(b=>b[0]===n)[2];
function chain(names,ends={}){const pts=names.map(canvasOf);return (x,y)=>{let best=1e9,bu=0;for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy))),d=(x-ax-t*dx)**2+(y-ay-t*dy)**2;if(d<best){best=d;bu=i+t;}}
 const i=Math.min(names.length-2,Math.floor(bu)),t=smooth(bu-i);return [[names[i],1-t],[names[i+1],t]];};}
const leg=side=>(x,y)=>{const t=smooth((y-800)/(896-800));return [['leg-top-'+side,1-t],['ankle-'+side,t]];};
const att={front:{},back:{},'scarf-front':{},'scarf-back':{},'sword-front':{},'sword-back':{}};
const put=(skin,slot,key,a)=>{(att[skin][slot]??={})[key]=a;};
for(const v of ['front','back']){
 put(v,'leg-left','leg',mesh('leg-far',2,8,leg('left')));put(v,'leg-right','leg',mesh('leg-near',2,8,leg('right')));
 put(v,'arm-left','arm',region('arm-far','arm-left'));put(v,'arm-right','arm',region('arm-near','arm-right'));
 put(v,v==='front'?'tail':'tail-front','tail',mesh('tail',10,10,chain(['tail','tail-mid','tail-mid2','tail-tip'])));
 put(v,'body','body',region(v==='front'?'body':'body-back','back-btm'));put(v,'head','head',region(v==='front'?'head':'head-back','head'));
 put(v,'ear-left','ear',region(v==='front'?'ear-far':'ear-far-back','ear-left'));put(v,'ear-right','ear',region(v==='front'?'ear-near':'ear-near-back','ear-right'));
 put('sword-'+v,'weapon','sword',region('sword','weapon'));put('sword-'+v,'slash','slash',region('slash','slash'));
}
put('scarf-front','scarf','wrap',region('scarf-wrap','neck'));put('scarf-front','brooch','brooch',region('brooch','neck'));
put('scarf-front','scarf-tail','tail',mesh('scarf-tail',10,3,chain(['scarf','scarf-mid','scarf-tip'])));
put('scarf-back','scarf','wrap',region('scarf-wrap-back','neck'));
put('scarf-back','scarf-tail','tail',mesh('scarf-tail-back',3,8,chain(['scarf-back','scarf-back-mid','scarf-back-tip'])));
for(const k of ['eyes','brows','mouth'])for(const v of Object.keys(F[k].variants))if(images[k+'-'+v])put('front',k,k+'-'+v,region(k+'-'+v,'gaze'));
const SETUP={tail:'tail','leg-left':'leg','leg-right':'leg','arm-left':'arm',body:'body','tail-front':'tail','scarf-tail':'tail','ear-left':'ear','ear-right':'ear',head:'head',eyes:'eyes-open',brows:'brows-calm',mouth:'mouth-smile',scarf:'wrap',brooch:'brooch',weapon:'sword','arm-right':'arm'};
const slots=SLOTS.map(([name,bone])=>({name,bone,attachment:SETUP[name]}));
const skins=[{name:'default',attachments:{}},...[['fox/front','front'],['gear/scarf-front','scarf-front'],['gear/sword-front','sword-front'],['fox/back','back'],['gear/scarf-back','scarf-back'],['gear/sword-back','sword-back']].map(([name,k])=>({name,attachments:att[k]}))];
const animations=buildAnimations();
const json={skeleton:{hash:'ember-fox-v1',spine:'4.2.73',x:-260,y:-10,width:520,height:500,images:'./images/'},bones,slots,skins,events:{'step-left':{},'step-right':{},strike:{}},animations};
fs.writeFileSync(path.join(out,'ember.json'),JSON.stringify(json));
// runtime contract consumed by the Cocos scripts (assets/scripts/EmberRig.ts)
const A=n=>WORLD[n];const contract={version:'ember-1.0',resource:'forest/ember/ember',canvas:{width:1000,height:1000,origin:[505,948],unitsPerPixel:UNIT},
 targets:{left:{ankle:{x:A('ankle-left')[0],y:A('ankle-left')[1]},toe:{x:A('ankle-left')[0]+20,y:A('ankle-left')[1]}},right:{ankle:{x:A('ankle-right')[0],y:A('ankle-right')[1]},toe:{x:A('ankle-right')[0]+20,y:A('ankle-right')[1]}}},
 worldUnitsPerSpineUnit:0.0059375,source:{size:1024,halfHeight:409.6,center:280,worldSize:4.864,bottom:-0.6445},walkDuration:WALK.duration,stride:WALK.stride,
 skins:{front:['fox/front','gear/scarf-front','gear/sword-front'],back:['fox/back','gear/scarf-back','gear/sword-back']},dyeSlots:['scarf','scarf-tail'],terrainOffsetBones:['ground-left','ground-right'],
 flatWalkPreview:{animation:'walk-preview',duration:WALK.duration,speed:WALK.speed,stride:WALK.stride},walkClips:{side:'walk',away:'walk-back',toward:'walk-front'}};
const rigTs=process.argv[3];if(rigTs)fs.writeFileSync(rigTs,'// Generated by tools/ember-fox/build.mjs - runtime contract for the Ember Fox skeleton.\nexport const EMBER_RIG='+JSON.stringify(contract,null,2)+' as const;\n');
console.log(JSON.stringify({bones:bones.length,slots:slots.length,images:Object.keys(images).length,page:[PAGE_W,pageH],animations:Object.keys(animations)}));
