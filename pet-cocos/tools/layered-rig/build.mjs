// Painted layered rig: cuts a Codex-painted parts sheet (laid out like template.png) into parts, puts each part
// where the Ember Fox's matching part sits, and binds them to the fox skeleton + code-generated animations
// (tools/ember-fox/anims.mjs), the same way tools/pet-rig does for its vector species.
// usage (from pet-cocos): node tools/layered-rig/build.mjs <kind> [sheet.png]   -> assets/resources/pets/rig/<kind>/
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
import {BONES,SLOTS,UNIT,sp} from '../ember-fox/rig.mjs';import {buildAnimations} from '../ember-fox/anims.mjs';
const kind=process.argv[2],sheetFile=process.argv[3]||`art-gen/parts/parts-${kind}.png`,out=`assets/resources/pets/rig/${kind}`;
const T=JSON.parse(fs.readFileSync('tools/layered-rig/template.json','utf8'));
// how a repainted part is fitted into the fox part's canvas box: which edge stays glued to the joint
const ANCHOR={head:[.5,1],body:[.5,.5],tail:[1,1],'ear-far':[.5,1],'ear-near':[.5,1],'arm-far':[.5,0],'arm-near':[.5,0],'leg-far':[.5,1],'leg-near':[.5,1],prop:[.5,.5]};
// parts may grow a little past the fox box so neighbours overlap instead of leaving gaps
const GROW={head:1.08,body:1.06,tail:1.04,'leg-far':1.04,'leg-near':1.04};
// a part keeps the size it was painted at (relative to the template), clamped around the fox part's size:
// tails may stay tiny (bear, turtle), arms may be big wings (bat), the torso may be a wide shell (turtle)
// per-pet size multipliers on top of the fit, for bodies that are not fox-shaped (checked against the portraits)
const SIZE={seal:{'leg-far':1.55,'leg-near':1.55,tail:.85},turtle:{tail:1.3,'leg-far':1.1,'leg-near':1.1},owl:{tail:.55},squirrel:{tail:1.35},hedgehog:{tail:.95},bat:{'arm-far':1.9,'arm-near':1.7},
 butterfly:{tail:.85},stardragon:{tail:.85},octopus:{'arm-far':1.2,'arm-near':1.2,'leg-far':1.15,'leg-near':1.15},dog:{tail:.7},bear:{tail:.6}};
// per-pet nudges (fox canvas px) for parts that sit elsewhere on the body: butterfly wings go behind the back, not at the hip
const RIGID_TAIL=new Set(['turtle']);
// parts Codex painted facing left are mirrored so the face looks the same way as the body (+x)
const MIRROR={seal:['head','tail']};
// pets with cream / near-white areas reachable through broken outlines (whiskers): only grey-free pure white is background
const STRICT_BG=new Set(['seal']);
const OFFSET={seal:{head:[0,-52],body:[0,-30],tail:[0,-20]},butterfly:{tail:[95,-150]},turtle:{tail:[135,-95]}}; // turtle: the stone shell rides on its back
const RANGE={tail:[0,1.05],'arm-far':[.85,1.7],'arm-near':[.85,1.7],body:[.85,1.45],prop:[.7,1.3]},DEF_RANGE=[.88,1.12];

// cut one cell: drop the near-white background (flood fill from the cell border), keep the big blobs, trim
async function cutCell(sheet,[cx,cy,cw,ch]){
 const sx=sheet.info.width/T.sheet[0],sy=sheet.info.height/T.sheet[1],ins=10;
 const left=Math.round((cx+ins)*sx),top=Math.round((cy+ins)*sy),W=Math.round((cw-2*ins)*sx),H=Math.round((ch-2*ins)*sy);
 const {data}=await sharp(sheet.buf).extract({left,top,width:W,height:H}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const white=i=>Math.min(data[i],data[i+1],data[i+2]);const bg=new Uint8Array(W*H),stack=[];
 for(let x=0;x<W;x++)stack.push(x,0,x,H-1);for(let y=0;y<H;y++)stack.push(0,y,W-1,y);
 while(stack.length){const y=stack.pop(),x=stack.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(bg[k])continue;const i4=k*4,w=white(i4);if(w<215||(STRICT_BG.has(kind)&&(w<232||Math.max(data[i4],data[i4+1],data[i4+2])-w>10)))continue;bg[k]=1;stack.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 // connected components of the foreground; small specks (stray hatching, frame bits) are dropped
 const lab=new Int32Array(W*H).fill(-1),sizes=[];
 for(let s=0;s<W*H;s++){if(bg[s]||lab[s]>=0)continue;const id=sizes.length;let n=0;const st=[s];lab[s]=id;
  while(st.length){const k=st.pop();n++;const x=k%W,y=(k/W)|0;for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(nx<0||ny<0||nx>=W||ny>=H)continue;const q=ny*W+nx;if(!bg[q]&&lab[q]<0){lab[q]=id;st.push(q);}}}sizes.push(n);}
 const big=Math.max(0,...sizes);if(big<400)return null;
 for(let k=0;k<W*H;k++){const i=k*4;if(bg[k]||sizes[lab[k]]<big*.04){data[i+3]=0;continue;}
  // soften only the rim pixels next to the background (cream fur inside a part must stay opaque)
  const x=k%W,y=(k/W)|0,rim=(x>0&&bg[k-1])||(x<W-1&&bg[k+1])||(y>0&&bg[k-W])||(y<H-1&&bg[k+W]);
  const w=white(i);data[i+3]=rim&&w>200?Math.round(255*(255-w)/55):255;}
 const img=sharp(data,{raw:{width:W,height:H,channels:4}}).trim({threshold:1});
 const {data:d2,info}=await img.raw().toBuffer({resolveWithObject:true});
 return {raw:d2,w:info.width,h:info.height};}

const sheet={buf:fs.readFileSync(sheetFile)};sheet.info=await sharp(sheet.buf).metadata();
const images={};
for(const [name,P] of Object.entries(T.parts)){const cut=await cutCell(sheet,P.cell);if(!cut)continue;
 // tails (and arms painted as wide wings) are matched by area, not squeezed into the fox's wide box (a squirrel's S-tail is tall); everything else fits its box
 const [bx,by,bw,bh]=P.canvas,g=GROW[name]||1,fit=name==='tail'||(name.startsWith('arm')&&cut.w/cut.h>1.6*bw/bh)?Math.min(Math.sqrt(bw*bh/(cut.w*cut.h)),1.8*bh/cut.h)*g:Math.min(bw*g/cut.w,bh*g/cut.h),painted=T.sheet[0]/sheet.info.width/T.scale;
 const [lo,hi]=RANGE[name]||DEF_RANGE,k=Math.max(fit*lo,Math.min(fit*hi,painted))*(SIZE[kind]?.[name]??1),w=Math.round(cut.w*k),h=Math.round(cut.h*k);
 const [ax,ay]=ANCHOR[name],[ox,oy]=OFFSET[kind]?.[name]||[0,0],left=bx+(bw-w)*ax+ox,top=by+(bh-h)*ay+oy;
 const buf=await sharp(cut.raw,{raw:{width:cut.w,height:cut.h,channels:4}}).flop(!!MIRROR[kind]?.includes(name)).resize(w,h,{kernel:'lanczos3'}).png().toBuffer();
 images[name==='prop'?'sword':name]={buf,left,top,w,h,pw:w,ph:h};}

// ears: the repainted head is rarely the fox's shape, so seat each ear on the painted head's real top edge
// (ear base sunk 30% into the head) and move the ear bone to the ear base so it still wiggles from the root
const canvasPos=Object.fromEntries(BONES.map(([n,,p])=>[n,[...p]]));
if(images.head){const H=images.head,{data:ha}=await sharp(H.buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const topAt=x=>{const c=Math.max(0,Math.min(H.w-1,Math.round(x-H.left)));for(let r=0;r<H.h;r++)if(ha[(r*H.w+c)*4+3]>128)return H.top+r;return H.top;};
 const [fx,,fw]=T.parts.head.canvas;
 for(const [ear,bone] of [['ear-far','ear-left'],['ear-near','ear-right']]){const E=images[ear];if(!E)continue;
  const [ex,,ew]=T.parts[ear].canvas,rel=(ex+ew/2-(fx+fw/2))/fw,cx=H.left+H.w/2+rel*H.w*.9;
  E.left=cx-E.w/2;E.top=topAt(cx)-E.h*.7;canvasPos[bone]=[cx,E.top+E.h*.85];}}
const WORLD=Object.fromEntries(Object.entries(canvasPos).map(([n,p])=>[n,sp(p)]));

// ---- atlas (power-of-two page so WebGL1 / mini-game devices sample it correctly)
// atlas pixels per fox-canvas px: pets show ~100 design px tall, so half resolution is still sharper than the screen
const RES=.5;for(const im of Object.values(images)){im.pw=Math.max(1,Math.round(im.w*RES));im.ph=Math.max(1,Math.round(im.h*RES));im.buf=await sharp(im.buf).resize(im.pw,im.ph,{fit:'fill'}).png().toBuffer();}
const PAD=4;let PAGE_W=512;const order=Object.entries(images).sort((a,b)=>b[1].ph-a[1].ph);
let x,y,row;const pack=()=>{x=PAD;y=PAD;row=0;for(const [,im] of order){if(x+im.pw+PAD>PAGE_W){x=PAD;y+=row+PAD;row=0;}im.ax=x;im.ay=y;x+=im.pw+PAD;row=Math.max(row,im.ph);}return y+row+PAD;};
let used=pack();if(used>PAGE_W){PAGE_W=1024;used=pack();}let pageH=1;while(pageH<used)pageH*=2;
fs.mkdirSync(out,{recursive:true});
await sharp({create:{width:PAGE_W,height:pageH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(order.map(([,im])=>({input:im.buf,left:im.ax,top:im.ay}))).png({compressionLevel:9,palette:true,quality:92,dither:.6,effort:10}).toFile(path.join(out,kind+'.png'));
fs.writeFileSync(path.join(out,kind+'.atlas'),`${kind}.png\nsize: ${PAGE_W}, ${pageH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+order.map(([n,im])=>`${n}\nbounds: ${im.ax}, ${im.ay}, ${im.pw}, ${im.ph}\n`).join(''));

// ---- skeleton: same bones/slots/animations as the fox; attachments mirror tools/pet-rig/build-pet.mjs
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
const canvasOf=n=>canvasPos[n];
function chain(names){const pts=names.map(canvasOf);return (x,y)=>{let best=1e9,bu=0;for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy))),d=(x-ax-t*dx)**2+(y-ay-t*dy)**2;if(d<best){best=d;bu=i+t;}}
 const i=Math.min(names.length-2,Math.floor(bu)),t=smooth(bu-i);return [[names[i],1-t],[names[i+1],t]];};}
const leg=side=>(x,y)=>{const t=smooth((y-800)/(896-800));return [['leg-top-'+side,1-t],['ankle-'+side,t]];};
const has=n=>!!images[n],att={front:{},'sword-front':{}};
const put=(skin,slot,key,a)=>{(att[skin][slot]??={})[key]=a;};
if(has('leg-far'))put('front','leg-left','leg',mesh('leg-far',2,8,leg('left')));if(has('leg-near'))put('front','leg-right','leg',mesh('leg-near',2,8,leg('right')));
if(has('arm-far'))put('front','arm-left','arm',region('arm-far','arm-left'));if(has('arm-near'))put('front','arm-right','arm',region('arm-near','arm-right'));
// a rigid back piece (turtle shell) follows the torso instead of bending along the tail chain
if(has('tail'))put('front','tail','tail',mesh('tail',10,10,RIGID_TAIL.has(kind)?()=>[['back-btm',1]]:chain(['tail','tail-mid','tail-mid2','tail-tip'])));
if(has('body'))put('front','body','body',region('body','back-btm'));if(has('head'))put('front','head','head',region('head','head'));
if(has('ear-far'))put('front','ear-left','ear',region('ear-far','ear-left'));if(has('ear-near'))put('front','ear-right','ear',region('ear-near','ear-right'));
if(has('sword'))put('sword-front','weapon','sword',region('sword','weapon'));
// the face is painted on the head, so the expression slots stay empty
const SETUP={tail:'tail','leg-left':'leg','leg-right':'leg','arm-left':'arm',body:'body','tail-front':'tail','ear-left':'ear','ear-right':'ear',head:'head',weapon:'sword','arm-right':'arm'};
const slots=SLOTS.map(([name,bone])=>({name,bone,...(SETUP[name]?{attachment:SETUP[name]}:{})}));
const skins=[{name:'default',attachments:{}},...[['fox/front','front'],['gear/scarf-front',null],['gear/sword-front','sword-front'],['fox/back','front'],['gear/scarf-back',null],['gear/sword-back','sword-front']].map(([name,k])=>({name,attachments:k?att[k]:{}}))];
// the fox clips are sampled at 60 fps; drop every key that linear interpolation of its neighbours reproduces
// within a tolerance far below what is visible (keeps the json ~5x smaller for the mini-game package)
const TOL={rotate:.15,translate:.15,scale:.002,shear:.15};
function simplify(keys,tol){if(keys.length<3)return keys;const fields=Object.keys(keys[0]).filter(f=>f!=='time'&&typeof keys[0][f]==='number');
 const keep=new Uint8Array(keys.length);keep[0]=keep[keys.length-1]=1;
 const dp=(a,b)=>{let worst=-1,wi=-1;for(let i=a+1;i<b;i++){const t=(keys[i].time-keys[a].time)/(keys[b].time-keys[a].time);
   for(const f of fields){const e=Math.abs((keys[a][f]??0)+((keys[b][f]??0)-(keys[a][f]??0))*t-(keys[i][f]??0));if(e>worst){worst=e;wi=i;}}}
  if(worst>tol){keep[wi]=1;dp(a,wi);dp(wi,b);}};dp(0,keys.length-1);return keys.filter((_,i)=>keep[i]);}
const animations=buildAnimations();delete animations['walk-preview'];delete animations['walk-back-preview']; // preview loops are only for the forest tools
for(const an of Object.values(animations))for(const tl of Object.values(an.bones||{}))for(const [kind2,keys] of Object.entries(tl))if(Array.isArray(keys)&&TOL[kind2]!==undefined)tl[kind2]=simplify(keys,TOL[kind2]);
const json={skeleton:{hash:kind+'-painted-v1',spine:'4.2.73',x:-260,y:-10,width:520,height:500,images:'./images/'},bones,slots,skins,events:{'step-left':{},'step-right':{},strike:{}},animations};
fs.writeFileSync(path.join(out,kind+'.json'),JSON.stringify(json));
// Cocos metas: keep existing ones (stable uuids), create the missing ones
const meta=(f,o)=>{if(!fs.existsSync(f))fs.writeFileSync(f,JSON.stringify(o,null,2));return JSON.parse(fs.readFileSync(f,'utf8')).uuid;};
const dirMeta=f=>meta(f,{ver:'1.2.0',importer:'directory',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
dirMeta(out+'.meta');
meta(path.join(out,kind+'.png.meta'),{ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'texture',hasAlpha:true}});
const atlas=meta(path.join(out,kind+'.atlas.meta'),{ver:'1.0.0',importer:'*',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
meta(path.join(out,kind+'.json.meta'),{ver:'1.2.7',importer:'spine-data',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{atlasUuid:atlas}});
console.log(JSON.stringify({kind,parts:Object.keys(images),page:[PAGE_W,pageH]}));
