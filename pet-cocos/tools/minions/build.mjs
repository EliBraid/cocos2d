// usage: node tools/minions/build.mjs <outDir>   -> minion.json / .atlas / .png (Spine 4.2)
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';import {png} from './render.mjs';
import {fuzz,shroom,elite} from './parts.mjs';import {BONES,SLOTS,WORLD,UNIT,sp} from './rig.mjs';import {buildAnimations} from './anims.mjs';
const out=process.argv[2]||'out';fs.mkdirSync(out,{recursive:true});const ZOOM=1;const images={};
const doc=s=>`<rect width="0" height="0"/>${s}`;
async function add(name,svg){const full=new (await import('@resvg/resvg-js')).Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${svg}</svg>`,{background:'rgba(0,0,0,0)'}).render().asPng();
 const {info}=await sharp(full).trim({threshold:0}).toBuffer({resolveWithObject:true});const left=-info.trimOffsetLeft,top=-info.trimOffsetTop;images[name]={buf:await sharp(full).extract({left,top,width:info.width,height:info.height}).png().toBuffer(),left,top,w:info.width,h:info.height};}
const kinds={fuzz:fuzz(),shroom:shroom(),elite:elite()};
for(const [k,parts] of Object.entries(kinds))for(const [n,svg] of Object.entries(parts))await add(k+'-'+n,svg);
const PAD=4,PW=1024;let x=PAD,y=PAD,row=0;const order=Object.entries(images).sort((a,b)=>b[1].h-a[1].h);for(const [,im] of order){if(x+im.w+PAD>PW){x=PAD;y+=row+PAD;row=0;}im.ax=x;im.ay=y;x+=im.w+PAD;row=Math.max(row,im.h);}
let PH=1;while(PH<y+row+PAD)PH*=2;
await sharp({create:{width:PW,height:PH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(order.map(([,im])=>({input:im.buf,left:im.ax,top:im.ay}))).png({compressionLevel:9}).toFile(path.join(out,'minion.png'));
fs.writeFileSync(path.join(out,'minion.atlas'),`minion.png\nsize: ${PW}, ${PH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+order.map(([n,im])=>`${n}\nbounds: ${im.ax}, ${im.ay}, ${im.w}, ${im.h}\n`).join(''));
const bones=BONES.map(([name,parent])=>{const w=WORLD[name],p=parent?WORLD[parent]:[0,0];return {name,...(parent?{parent}:{}),x:+(w[0]-p[0]).toFixed(3),y:+(w[1]-p[1]).toFixed(3)};});
const slotBone=Object.fromEntries(SLOTS);const region=(name,bone)=>{const im=images[name],c=sp([im.left+im.w/2,im.top+im.h/2]),b=WORLD[bone];return {path:name,x:+(c[0]-b[0]).toFixed(2),y:+(c[1]-b[1]).toFixed(2),width:im.w*UNIT,height:im.h*UNIT};};
const skins=[{name:'default',attachments:{}},...Object.keys(kinds).map(k=>({name:k,attachments:{'foot-left':{'foot':region(k+'-foot-left','foot-left')},'foot-right':{'foot':region(k+'-foot-right','foot-right')},body:{body:region(k+'-body','body')},top:{top:region(k+'-top','top')},
 face:{'face-angry':region(k+'-face-angry','face'),'face-hurt':region(k+'-face-hurt','face')}}}))];
const setup={'foot-left':'foot','foot-right':'foot',body:'body',top:'top',face:'face-angry'};
const json={skeleton:{hash:'minion-v1',spine:'4.2.73',x:-60,y:-5,width:120,height:130,images:'./images/'},bones,slots:SLOTS.map(([name,bone])=>({name,bone,attachment:setup[name]})),skins,events:{bite:{}},animations:buildAnimations()};
fs.writeFileSync(path.join(out,'minion.json'),JSON.stringify(json));console.log('minion',Object.keys(images).length,'images',PW+'x'+PH,Object.keys(json.animations));
