// Home-screen UI art in the project's ink-and-paper style (logo emblem, ribbon,
// wooden signs, icons, stage thumbnail). usage: node ui-art.mjs <outDir> <boardPng> <crystalRedPng> <portalPng>
import fs from 'node:fs';import sharp from 'sharp';import {Resvg} from '@resvg/resvg-js';import {catmull,d,ellipse} from './geom.mjs';
const [,,out='out',board,red,portal]=process.argv;fs.mkdirSync(out,{recursive:true});const INK='#2a1a12';
const png=(svg,w,h,file,zoom=2)=>fs.writeFileSync(out+'/'+file,new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${svg}</svg>`,{fitTo:{mode:'zoom',value:zoom},background:'rgba(0,0,0,0)'}).render().asPng());
const line=(p,w=4,c=INK,x='')=>`<path d="${d(p,false)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
const shape=(p,fill,w=5)=>`<path d="${d(p)}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
const sm=(p,n=10)=>catmull(p,true,n);
// --- logo emblem: shield with a paw, burst lines behind
let e='';for(let i=0;i<9;i++){const a=(-160+i*17.5)*Math.PI/180;e+=line([[100+Math.cos(a)*70,92+Math.sin(a)*70],[100+Math.cos(a)*(92+(i%2)*10),92+Math.sin(a)*(92+(i%2)*10)]],5);}
e+=shape(sm([[46,44],[100,30],[154,44],[150,112],[100,152],[50,112]],8),'#3a3a35',6)+shape(sm([[58,52],[100,42],[142,52],[138,108],[100,140],[62,108]],8),'#f9f7ec',4);
e+=`<ellipse cx="100" cy="102" rx="20" ry="16" fill="${INK}"/>`;for(const [x,y,r] of [[78,80,8],[92,68,8],[108,68,8],[122,80,8]])e+=`<ellipse cx="${x}" cy="${y}" rx="${r*.8}" ry="${r}" fill="${INK}"/>`;
png(e,200,170,'emblem.png');
// --- ribbon banner behind the tagline
const rib=shape(sm([[20,26],[60,14],[380,14],[420,26],[404,46],[420,66],[380,58],[60,58],[20,66],[36,46]],4),'#f9f7ec',5)+line([[60,20],[60,54]],3,INK,'opacity=".5"')+line([[380,20],[380,54]],3,INK,'opacity=".5"');
png(rib,440,80,'ribbon.png');
// --- wooden sign plank (text is drawn by the game)
let sign=line([[30,70],[30,96]],7)+line([[150,70],[150,96]],7)+line([[30,70],[30,96]],4,'#8a5a32')+line([[150,70],[150,96]],4,'#8a5a32');
sign+=shape(sm([[8,14],[172,10],[176,40],[170,70],[10,72],[4,42]],3),'#c8955e',5)+`<path d="${d(sm([[14,18],[166,15],[168,30],[14,34]],3))}" fill="#dcae78"/>`+line([[20,48],[60,47]],2.5,INK,'opacity=".4"')+line([[110,58],[160,56]],2.5,INK,'opacity=".4"')+`<circle cx="20" cy="22" r="3" fill="${INK}"/><circle cx="160" cy="20" r="3" fill="${INK}"/>`;
png(sign,180,100,'sign.png');
// --- WeChat-like double speech bubble icon (generic chat bubbles, white on button)
const bub=(cx,cy,rx,ry,tail)=>`<path d="${d(ellipse(cx,cy,rx,ry,48))}" fill="#fff" stroke="${INK}" stroke-width="4"/>`+`<path d="M${tail}" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
png(bub(44,42,34,28,'24 62 L18 78 L38 66 Z')+`<circle cx="32" cy="38" r="4" fill="${INK}"/><circle cx="56" cy="38" r="4" fill="${INK}"/>`+bub(78,66,28,23,'92 84 L98 96 L82 88 Z')+`<circle cx="70" cy="64" r="3.5" fill="${INK}"/><circle cx="88" cy="64" r="3.5" fill="${INK}"/>`,112,104,'chat.png');
// --- crossed swords
const sword=(rot)=>`<g transform="translate(60 60) rotate(${rot})"><path d="M-6 -52 L0 -62 L6 -52 L6 18 L-6 18 Z" fill="#e6eaf0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-18" y="16" width="36" height="8" rx="3" fill="#f6c330" stroke="${INK}" stroke-width="4"/><rect x="-4" y="24" width="8" height="18" fill="#7b4a2c" stroke="${INK}" stroke-width="4"/><circle cx="0" cy="46" r="6" fill="#f6c330" stroke="${INK}" stroke-width="4"/></g>`;
png(sword(-40)+sword(40),120,120,'swords.png');
// --- stage thumbnail: board crop with the red core and a portal
if(board){const b=await sharp(board).extract({left:60,top:220,width:690,height:420}).resize(345,210).toBuffer();const r=await sharp(red).resize(110,108).toBuffer();const p=await sharp(portal).resize(80,50,{fit:'fill'}).toBuffer();
 const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="345" height="210"><rect x="3" y="3" width="339" height="204" rx="14" fill="none" stroke="${INK}" stroke-width="6"/></svg>`);
 await sharp(b).composite([{input:p,left:20,top:40},{input:p,left:245,top:40},{input:r,left:118,top:12},{input:frame,left:0,top:0}]).png().toFile(out+'/stage-thumb.png');}
console.log('ui art ok');
