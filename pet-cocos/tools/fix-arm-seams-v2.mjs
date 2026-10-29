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

/** Directional dilate: grow opaque pixels toward a bias vector (dx,dy) in image space. */
async function dilateToward(srcPath,dstPath,{radius=12,bias=[0,0],alpha=220}={}){
  await fs.copyFile(srcPath,dstPath);
  const {data,info}=await sharp(dstPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const outBuf=Buffer.from(data);
  const [bx,by]=bias;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const k=(y*info.width+x)*4; if(data[k+3]>40) continue;
    let sr=0,sg=0,sb=0,n=0,best=1e9;
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(dx*dx+dy*dy>radius*radius) continue;
      // Prefer samples opposite the bias (grow into empty from body side)
      const prefer=dx*bx+dy*by; // positive if neighbor is toward bias origin
      const xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=info.width||yy>=info.height) continue;
      const j=(yy*info.width+xx)*4; if(data[j+3]<=40) continue;
      const score=dx*dx+dy*dy - prefer*4;
      if(score<best){best=score;sr=data[j];sg=data[j+1];sb=data[j+2];n=1;}
      else if(Math.abs(score-best)<1){sr+=data[j];sg+=data[j+1];sb+=data[j+2];n++;}
    }
    if(n){outBuf[k]=sr/n|0;outBuf[k+1]=sg/n|0;outBuf[k+2]=sb/n|0;outBuf[k+3]=alpha;}
  }
  await sharp(outBuf,{raw:info}).png().toFile(dstPath);
  console.log('dilated',path.basename(dstPath),'r',radius,'bias',bias);
}

// Front arms: grow toward shoulder (body). arm-left shoulder is right/up; arm-right left/up.
await dilateToward(path.join(oldParts,'arm-left.png'),path.join(parts,'arm-left.png'),{radius:14,bias:[1,-1]});
await dilateToward(path.join(oldParts,'arm-right.png'),path.join(parts,'arm-right.png'),{radius:14,bias:[-1,-1]});
// Scarf: grow upward toward chin to close neck gap
await dilateToward(path.join(oldParts,'scarf.png'),path.join(parts,'scarf.png'),{radius:10,bias:[0,-1],alpha:230});
const backScarfSrc=path.join(oldParts,'back-scarf.png');
try{await fs.access(backScarfSrc); await dilateToward(backScarfSrc,path.join(parts,'back-scarf.png'),{radius:10,bias:[0,-1],alpha:230});}catch{}

// Back arm crops — larger, reach into torso for overlap
const crops={
  'arm-right-back':{left:820,top:540,width:340,height:480},
  'arm-left-back':{left:430,top:680,width:180,height:190},
};
for(const [name,box] of Object.entries(crops)){
  await sharp(backCanon).extract(box).png().toFile(path.join(parts,name+'.png'));
  console.log('cropped',name,box);
}

// Soften carry further — tuck free arm, lower sword elbow flare
const carry={'arm-left':-6,'fore-left':4,'arm-right':-22,'fore-right':8,weapon:4};
const rearCarry={'rear-arm-left':-6,'rear-fore-left':4,'rear-arm-right':-22,'rear-fore-right':8,'rear-weapon':4};
for(const clip of ['idle']){
  const bones=rig.animations[clip]?.bones; if(!bones) continue;
  for(const [name,value] of Object.entries({...carry,...rearCarry})){
    if(!bones[name]) bones[name]={};
    bones[name].rotate=[{time:0,value},{time:rig.animations[clip].duration||2,value}];
  }
}
// Rebuild walk arm channels around new carry with small swing
for(const clip of ['walk','walk-back','walk-preview']){
  const bones=rig.animations[clip]?.bones; if(!bones) continue;
  const keys=Object.entries({...carry,...rearCarry});
  for(const [name,base] of keys){
    if(!bones[name]?.rotate?.length) continue;
    const frames=bones[name].rotate;
    const mid=frames.length>>1;
    for(let i=0;i<frames.length;i++){
      const phase=Math.sin((i/frames.length)*Math.PI*2);
      const amp=name.includes('weapon')||name.includes('fore')?2:6;
      frames[i].value=base+phase*amp*(name.includes('left')?1:-0.35);
    }
  }
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
const frontTail=rig.skins.find(s=>s.name==='default').attachments.tail.tail;
rear.attachments.tail={tail:structuredClone(frontTail)};

// Pull rear shoulder bones slightly inward for more overlap with shell
const setX=(n,x)=>{const b=rig.bones.find(b=>b.name===n); if(b) b.x=x;};
setX('rear-arm-left',-55);
setX('rear-arm-right',64);

// Rebuild front scarf mesh path still 'scarf' — image replaced in atlas only.
// Rebuild atlas
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
rig.skeleton.hash='fox-v054-seams-v2';
await fs.writeFile(path.join(out,'fox.json'),JSON.stringify(rig,null,2));

// Sync FoxWalkPose FOX_CARRY
const posePath=path.join(root,'assets/scripts/FoxWalkPose.ts');
let pose=await fs.readFile(posePath,'utf8');
pose=pose.replace(/export const FOX_CARRY=\{[^}]+\};/,
  `export const FOX_CARRY={'arm-left':${carry['arm-left']},'fore-left':${carry['fore-left']},'arm-right':${carry['arm-right']},'fore-right':${carry['fore-right']},weapon:${carry.weapon}};`);
await fs.writeFile(posePath,pose);
console.log(JSON.stringify({ok:true,sprites:sprites.length,height,carry,hash:rig.skeleton.hash}));
