// Renders the Ember Fox's movable parts as an "exploded" parts sheet. Codex repaints this sheet for each
// pet (same cells, same part shapes and joints) in the pet's portrait style; paint-parts.mjs then cuts the
// painted cells back out and rigs them on the fox skeleton.
// usage (from pet-cocos): node tools/layered-rig/template.mjs
import fs from 'node:fs';import sharp from 'sharp';
import {png} from '../ember-fox/render.mjs';import {front} from '../ember-fox/parts.mjs';
const OUT='tools/layered-rig',SHEET=[1536,1024],K=.72;
// cell rects on the sheet [x,y,w,h]; each part is centred in its own cell
export const CELLS={head:[24,24,560,500],body:[600,24,400,500],tail:[1016,24,496,500],
 'ear-far':[24,548,200,220],'ear-near':[236,548,200,220],'arm-far':[448,548,200,452],'arm-near':[660,548,200,452],
 'leg-far':[872,548,200,452],'leg-near':[1084,548,200,452],prop:[1296,548,216,452]};
const F=front();
const svgOf={head:F.head.svg+F.eyes.variants.open+F.brows.variants.calm+F.mouth.variants.smile,body:F.body.svg,tail:F.tail.svg,
 'ear-far':F['ear-far'].svg,'ear-near':F['ear-near'].svg,'arm-far':F['arm-far'].svg,'arm-near':F['arm-near'].svg,
 'leg-far':F['leg-far'].svg,'leg-near':F['leg-near'].svg,prop:F.sword.svg};
const layers=[],meta={sheet:SHEET,scale:K,parts:{}};
for(const [name,[cx,cy,cw,ch]] of Object.entries(CELLS)){
 const full=png(svgOf[name],K),{info}=await sharp(full).trim({threshold:0}).toBuffer({resolveWithObject:true});
 const left=-info.trimOffsetLeft,top=-info.trimOffsetTop;
 const buf=await sharp(full).extract({left,top,width:info.width,height:info.height}).png().toBuffer();
 const x=Math.round(cx+(cw-info.width)/2),y=Math.round(cy+(ch-info.height)/2);layers.push({input:buf,left:x,top:y});
 // canvas-space bbox of the part (fox canvas px), used to put the repainted part back in place
 meta.parts[name]={canvas:[left/K,top/K,info.width/K,info.height/K],cell:[cx,cy,cw,ch]};}
// thin grey cell frames help the image model keep each part in its own box
const frames=Object.values(CELLS).map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#d8d8d8" stroke-width="3"/>`).join('');
const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET[0]}" height="${SHEET[1]}"><rect width="100%" height="100%" fill="#fff"/>${frames}</svg>`);
await sharp(bg).composite(layers).png().toFile(OUT+'/template.png');
fs.writeFileSync(OUT+'/template.json',JSON.stringify(meta,null,1));
console.log('template',SHEET.join('x'),Object.keys(CELLS).length,'cells');
