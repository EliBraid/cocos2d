import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {organicMesh} from './organic-mesh.mjs';
import {worldBones} from './mesh.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'assets/proto/forest/fox');
const parts=path.join(root,'source-assets/fox-v052/images');
const oldParts=path.join(root,'source-assets/fox-v05/images');
const backCanon=path.join(root,'source-assets/fox-v05/back-canonical.png');
const registration=JSON.parse(await fs.readFile(path.join(root,'source-assets/fox-v05/registration.json'),'utf8'));
const rig=JSON.parse(await fs.readFile(path.join(out,'fox.json'),'utf8'));
const idx=n=>rig.bones.findIndex(b=>b.name===n);
const bind=worldBones(rig.bones);

const leftBox={left:450,top:700,width:150,height:160};
const rightBox={left:860,top:560,width:300,height:460};
await sharp(backCanon).extract(leftBox).png().toFile(path.join(parts,'arm-left-back.png'));
await sharp(backCanon).extract(rightBox).png().toFile(path.join(parts,'arm-right-back.png'));
console.log('recropped left',leftBox);

function regionMesh(name,boneNames,box){
  const origin=registration.canvas.origin, upp=registration.canvas.unitsPerPixel;
  const cx=box.left+box.width/2, cy=box.top+box.height/2;
  const x=(cx-origin[0])*upp, y=(origin[1]-cy)*upp;
  const width=box.width*upp, height=box.height*upp;
  const layer={path:name,x,y,width,height};
  return organicMesh(layer,0,bind,(u,v)=>{
    const t=Math.max(0,Math.min(1,1-v));
    const p=t*(boneNames.length-1);
    return boneNames.map((n,i)=>[idx(n),Math.max(0,1-Math.abs(p-i))]);
  },[[.3,.25],[.7,.25],[.5,.55],[.35,.8],[.65,.8]]);
}

const rear=rig.skins.find(s=>s.name==='fox/back');
rear.attachments['arm-right']={'arm-right':regionMesh('arm-right-back',['rear-arm-right','rear-fore-right','rear-hand-right'],rightBox)};
rear.attachments['arm-left']={'arm-left':regionMesh('arm-left-back',['rear-arm-left','rear-fore-left','rear-hand-left'],leftBox)};

const used=new Set();
for(const skin of rig.skins) for(const attachments of Object.values(skin.attachments||{})) for(const [,a] of Object.entries(attachments)) if(a.path) used.add(a.path);
let x=4,y=4,row=0; const sprites=[];
for(const name of [...used].sort()){
  let file=path.join(parts,name+'.png');
  try{await fs.access(file);}catch{file=path.join(oldParts,name+'.png');}
  try{await fs.access(file);}catch{continue;}
  const m=await sharp(file).metadata();
  if(x+m.width+4>2048){x=4;y+=row+4;row=0;}
  sprites.push({name,file,x,y,w:m.width,h:m.height}); x+=m.width+4; row=Math.max(row,m.height);
}
const height=2**Math.ceil(Math.log2(Math.max(y+row+4,1)));
await sharp({create:{width:2048,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite(sprites.map(s=>({input:s.file,left:s.x,top:s.y}))).png().toFile(path.join(out,'fox.png'));
const atlas=`fox.png\nsize: 2048, ${height}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+sprites.map(s=>`${s.name}\nbounds: ${s.x}, ${s.y}, ${s.w}, ${s.h}\noffsets: 0, 0, ${s.w}, ${s.h}\nrotate: false\nindex: -1\n`).join('');
await fs.writeFile(path.join(out,'fox.atlas'),atlas);
rig.skeleton.hash='fox-v054-back-arms-v5';
await fs.writeFile(path.join(out,'fox.json'),JSON.stringify(rig,null,2));
console.log(JSON.stringify({ok:true,sprites:sprites.length,height}));

