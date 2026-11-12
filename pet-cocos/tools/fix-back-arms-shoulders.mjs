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

// Crops are in back-canonical pixels (top-left origin). Canvas is ~1283x1226.
const crops={
  // sword-side arm from behind
  'arm-right-back':{left:860,top:560,width:300,height:460},
  // tucked near-side paw/arm (dark blob ~486-570,647-699)
  'arm-left-back':{left:450,top:700,width:150,height:160},
};

for(const [name,box] of Object.entries(crops)){
  await sharp(backCanon).extract(box).png().toFile(path.join(parts,name+'.png'));
  console.log('cropped',name,box);
}

// One clean dilate of FRONT arm plates from restored fox-v05 originals.
for(const side of ['left','right']){
  const src=path.join(parts,'arm-'+side+'.png');
  const orig=path.join(oldParts,'arm-'+side+'.png');
  await fs.copyFile(orig,src);
  const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const outBuf=Buffer.from(data);
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const k=(y*info.width+x)*4; if(data[k+3]>40) continue;
    let sr=0,sg=0,sb=0,n=0;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=info.width||yy>=info.height) continue;
      const j=(yy*info.width+xx)*4; if(data[j+3]>40){sr+=data[j];sg+=data[j+1];sb+=data[j+2];n++;}
    }
    if(n){outBuf[k]=sr/n|0;outBuf[k+1]=sg/n|0;outBuf[k+2]=sb/n|0;outBuf[k+3]=200;}
  }
  await sharp(outBuf,{raw:info}).png().toFile(src);
  console.log('dilated front arm',side,info.width,info.height);
}

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
rear.attachments['arm-right']={'arm-right':regionMesh('arm-right-back',['rear-arm-right','rear-fore-right','rear-hand-right'],crops['arm-right-back'])};
rear.attachments['arm-left']={'arm-left':regionMesh('arm-left-back',['rear-arm-left','rear-fore-left','rear-hand-left'],crops['arm-left-back'])};

// Re-enable the front tail mesh on the back skin (empty 1x1 left a ghost seam).
const frontTail=rig.skins.find(s=>s.name==='default').attachments.tail.tail;
rear.attachments.tail={tail:structuredClone(frontTail)};

// Soften walk + walk-back arm/weapon rotate toward soft carry rest.
const rest={
  'arm-left':-14,'fore-left':-2,'arm-right':-34,'fore-right':12,weapon:8,
  'rear-arm-left':-14,'rear-fore-left':-2,'rear-arm-right':-34,'rear-fore-right':12,'rear-weapon':8
};
for(const clip of ['walk','walk-back']){
  const bones=rig.animations[clip]?.bones; if(!bones) continue;
  for(const [name,base] of Object.entries(rest)){
    if(!bones[name]?.rotate) continue;
    for(const k of bones[name].rotate){
      if(typeof k.value==='number') k.value=base+(k.value-base)*0.5;
    }
  }
}

const used=new Set();
for(const skin of rig.skins) for(const attachments of Object.values(skin.attachments||{})) for(const [,a] of Object.entries(attachments)) if(a.path) used.add(a.path);
let x=4,y=4,row=0; const sprites=[];
for(const name of [...used].sort()){
  let file=path.join(parts,name+'.png');
  try{await fs.access(file);}catch{file=path.join(oldParts,name+'.png');}
  try{await fs.access(file);}catch{console.warn('missing',name);continue;}
  const m=await sharp(file).metadata();
  if(x+m.width+4>2048){x=4;y+=row+4;row=0;}
  sprites.push({name,file,x,y,w:m.width,h:m.height}); x+=m.width+4; row=Math.max(row,m.height);
}
const height=2**Math.ceil(Math.log2(Math.max(y+row+4,1)));
await sharp({create:{width:2048,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite(sprites.map(s=>({input:s.file,left:s.x,top:s.y}))).png().toFile(path.join(out,'fox.png'));
await fs.writeFile(path.join(out,'fox.atlas'),`fox.png\nsize: 2048, ${height}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+sprites.map(s=>`${s.name}\nbounds: ${s.x}, ${s.y}, ${s.w}, ${s.h}\noffsets: 0, 0, ${s.w}, ${s.h}\nrotate: false\nindex: -1\n`).join(''));
rig.skeleton.hash='fox-v054-back-arms-v3';
await fs.writeFile(path.join(out,'fox.json'),JSON.stringify(rig,null,2));
console.log(JSON.stringify({ok:true,sprites:sprites.length,height,arms:Object.keys(crops)}));

