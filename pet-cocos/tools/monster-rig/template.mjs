// Lays the minion rig's 毛球怪 parts out as a parts sheet (body, top, angry face, hurt face, two feet) for Codex to
// repaint per monster. Same idea as tools/layered-rig/template.mjs for pets.
// usage (from pet-cocos): node tools/monster-rig/template.mjs
import fs from 'node:fs';import sharp from 'sharp';
const RIG='assets/resources/battle/minion/minion',OUT='tools/monster-rig',SHEET=[1536,1024],K=2; // K: sheet px per atlas px
export const CELLS={body:[24,24,760,640],top:[800,24,712,380],'face-angry':[800,420,348,244],'face-hurt':[1164,420,348,244],'foot-left':[24,680,300,320],'foot-right':[340,680,300,320]};
const bounds={};{let cur;for(const l of fs.readFileSync(RIG+'.atlas','utf8').split(/\r?\n/)){const m=l.match(/^\s*bounds:\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);if(m)bounds[cur]=m.slice(1).map(Number);else if(l.trim()&&!l.includes(':'))cur=l.trim();}}
const layers=[];
for(const [name,[cx,cy,cw,ch]] of Object.entries(CELLS)){const [x,y,w,h]=bounds['fuzz-'+name];
 const buf=await sharp(RIG+'.png').extract({left:x,top:y,width:w,height:h}).resize(w*K,h*K).png().toBuffer();
 layers.push({input:buf,left:Math.round(cx+(cw-w*K)/2),top:Math.round(cy+(ch-h*K)/2)});}
const frames=Object.values(CELLS).map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#d8d8d8" stroke-width="3"/>`).join('');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET[0]}" height="${SHEET[1]}"><rect width="100%" height="100%" fill="#fff"/>${frames}</svg>`)).composite(layers).png().toFile(OUT+'/template.png');
fs.writeFileSync(OUT+'/template.json',JSON.stringify({sheet:SHEET,scale:K,cells:CELLS},null,1));console.log('monster template ok');
