import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const file=path.join(root,'assets/proto/forest/fox/fox.json');
const rig=JSON.parse(await fs.readFile(file,'utf8'));
const carry={'arm-left':-8,'fore-left':2,'arm-right':-28,'fore-right':10,weapon:6};
const rear={'rear-arm-left':-8,'rear-fore-left':2,'rear-arm-right':-28,'rear-fore-right':10,'rear-weapon':6};
const all={...carry,...rear};
for(const clip of ['idle']){
  const bones=rig.animations[clip].bones;
  for(const [name,value] of Object.entries(all)){
    bones[name]=bones[name]||{};
    bones[name].rotate=[{time:0,value},{time:2,value}];
  }
}
for(const clip of ['walk','walk-back','walk-preview']){
  const bones=rig.animations[clip]?.bones; if(!bones) continue;
  for(const [name,base] of Object.entries(all)){
    if(!bones[name]?.rotate?.length) continue;
    const frames=bones[name].rotate;
    const n=frames.length;
    for(let i=0;i<n;i++){
      const phase=Math.sin((i/Math.max(1,n-1))*Math.PI*2);
      const amp=name.includes('weapon')||name.includes('fore')?1.5:5;
      const sign=name.includes('left')&&!name.includes('weapon')?1:-0.3;
      frames[i].value=base+phase*amp*sign;
    }
    frames[n-1].value=frames[0].value;
  }
}
rig.skeleton.hash='fox-v054-seams-v3';
await fs.writeFile(file,JSON.stringify(rig,null,2));
const posePath=path.join(root,'assets/scripts/FoxWalkPose.ts');
let pose=await fs.readFile(posePath,'utf8');
pose=pose.replace(/export const FOX_CARRY=\{[^}]+\};/,
  "export const FOX_CARRY={'arm-left':-8,'fore-left':2,'arm-right':-28,'fore-right':10,weapon:6};");
await fs.writeFile(posePath,pose);
console.log(JSON.stringify({ok:true,hash:rig.skeleton.hash,carry}));
