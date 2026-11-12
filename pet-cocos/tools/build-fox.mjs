import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {worldBones,weightedMesh} from './mesh.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');
const project=fileURLToPath(new URL('../',import.meta.url));
const original=path.join(project,'source-assets/fox-v1'),out=path.join(project,'assets/proto/fox');
await fs.mkdir(out,{recursive:true});
const rig=JSON.parse(await fs.readFile(path.join(original,'W04.json'),'utf8')),bones=rig.bones;
const index=name=>bones.findIndex(b=>b.name===name),round=n=>Math.round(n*1000000)/1000000;
const parts=rig.skins[0].attachments;
function point(region,slot,u,v){const b=worldBones(bones)[index(slot)],r=(region.rotation||0)*Math.PI/180,x=region.x+(u-.5)*region.width*Math.cos(r)-(.5-v)*region.height*Math.sin(r),y=region.y+(u-.5)*region.width*Math.sin(r)+(.5-v)*region.height*Math.cos(r);return [b.x+b.a*x+b.c*y,b.y+b.b*x+b.d*y];}
function add(name,parent,point,angle,length=70){const m=worldBones(bones)[index(parent)],dx=point[0]-m.x,dy=point[1]-m.y;const pa=Math.atan2(m.b,m.a)*180/Math.PI;bones.push({name,parent,x:round(m.a*dx+m.b*dy),y:round(m.c*dx+m.d*dy),rotation:round(angle-pa),length});return index(name);}
const h=parts.head['head-neutral'];
add('ear-left','head',point(h,'head',.22,.43),112,110);add('ear-right','head',point(h,'head',.78,.43),65,110);
add('tail-mid','tail',point(parts.tail.tail,'tail',.56,.57),150,100);add('tail-tip','tail-mid',point(parts.tail.tail,'tail',.20,.24),150,90);
add('scarf-mid','accessory',point(parts.accessory.accessory,'accessory',.55,.48),175,85);add('scarf-tip','scarf-mid',point(parts.accessory.accessory,'accessory',.18,.35),170,75);
add('elbow-left','arm-left',point(parts['arm-left']['arm-left'],'arm-left',.48,.52),-125,45);
add('elbow-right','arm-right',point(parts['arm-right']['arm-right'],'arm-right',.48,.52),-45,45);
add('hand-right','elbow-right',point(parts['arm-right']['arm-right'],'arm-right',.85,.85),-45,35);
add('torso-top','chest',[0,280],90,40);
// Reparent the sword while preserving its setup world pose: elbow and wrist
// animation must carry the weapon instead of letting it float beside the hand.
const before=worldBones(bones),weapon=bones[index('weapon')],wp=before[index('weapon')],parent=before[index('hand-right')];
weapon.parent='hand-right';weapon.x=round(parent.a*(wp.x-parent.x)+parent.b*(wp.y-parent.y));weapon.y=round(parent.c*(wp.x-parent.x)+parent.d*(wp.y-parent.y));weapon.rotation=round(Math.atan2(wp.b,wp.a)*180/Math.PI-Math.atan2(parent.b,parent.a)*180/Math.PI);
bones.splice(index('weapon'),1);bones.push(weapon);
const matrices=worldBones(bones),smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const chain=(names,t)=>{const x=Math.max(0,Math.min(1,t))*(names.length-1);return names.map((n,i)=>[index(n),Math.max(0,1-Math.abs(x-i))]);};
for(const slot of rig.slots){
 if(['weapon','leg-left','leg-right'].includes(slot.name))continue;
 for(const [name,region] of Object.entries(parts[slot.name])){
  const base=index(slot.bone);let weights;
  if(slot.name==='head')weights=(u,v)=>{const l=smooth(.46,.08,u)*smooth(.55,.14,v),r=smooth(.54,.92,u)*smooth(.55,.14,v);return [[base,1-l-r],[index('ear-left'),l],[index('ear-right'),r]];};
  else if(slot.name==='tail')weights=(u,v)=>chain(['tail','tail-mid','tail-tip'],(1-u)*.62+(1-v)*.38);
  else if(slot.name==='accessory')weights=u=>chain(['accessory','scarf-mid','scarf-tip'],(1-u)*1.13);
  else if(slot.name==='arm-left')weights=(u,v)=>chain(['arm-left','elbow-left'],smooth(.15,.9,v));
  else if(slot.name==='arm-right')weights=(u,v)=>chain(['arm-right','elbow-right','hand-right'],v);
  else weights=(u,v)=>chain(['chest','torso-top'],smooth(.8,.12,v)*.85);
  parts[slot.name][name]=weightedMesh(region,base,matrices,weights,10);
 }
}
const wave=(duration,amp,phase=0,n=32)=>Array.from({length:n+1},(_,i)=>({time:round(i*duration/n),value:round(amp*Math.sin(i/n*Math.PI*2+phase))}));
const close=a=>{a[a.length-1]={...a[0],time:a.at(-1).time};return a;};
const rot=(duration,amp,phase=0)=>({rotate:close(wave(duration,amp,phase))});
const idleBones={body:{translate:close(wave(4,1.5).map(f=>({time:f.time,x:0,y:f.value}))),...rot(4,.55)},chest:rot(4,.6,.5),'torso-top':{translate:close(wave(4,1.5).map(f=>({time:f.time,x:f.value,y:0})))},head:rot(4,1.3,.3),tail:rot(4,2.5,.8),'tail-mid':rot(4,3.5,.4),'tail-tip':rot(4,5,0),'scarf-mid':rot(4,2.2,.2),'scarf-tip':rot(4,3.7,-.2),'arm-left':rot(4,1.2,.3),'arm-right':rot(4,1.1,.3),'ear-left':{rotate:[{value:0},{time:2.15,value:0},{time:2.22,value:5},{time:2.32,value:-3},{time:2.5,value:0},{time:4,value:0}]},'ear-right':rot(4,1.4,.5)};
rig.animations.idle={bones:idleBones};
const walkBones={body:{translate:close(wave(.72,3,0).map(f=>({time:f.time,x:0,y:3+Math.abs(f.value)})))},head:rot(.72,2),tail:rot(.72,3,.4),'tail-mid':rot(.72,4,.1),'tail-tip':rot(.72,6,-.4),'scarf-mid':rot(.72,3,.3),'scarf-tip':rot(.72,5,-.2),'leg-left':rot(.72,17,Math.PI/2),'leg-right':rot(.72,17,-Math.PI/2),'arm-left':rot(.72,9,-Math.PI/2),'arm-right':rot(.72,6,Math.PI/2),'elbow-left':rot(.72,4), 'ear-left':rot(.72,2.5,.5),'ear-right':rot(.72,2.5,.5)};
rig.animations.walk={bones:walkBones,events:[{time:.08,name:'step'},{time:.44,name:'step'}]};
const keys=(values,times)=>values.map((value,i)=>({time:times[i],value}));
const times=[0,.16,.29,.43,.62,.82];
rig.animations.attack={bones:{body:{rotate:keys([0,-4,7,4,0,0],times),translate:[{x:0,y:0},{time:.16,x:-9,y:-3},{time:.29,x:17,y:1},{time:.43,x:10,y:0},{time:.62,x:0,y:0},{time:.82,x:0,y:0}]},head:{rotate:keys([0,-4,5,3,0,0],times)},'arm-right':{rotate:keys([0,64,-66,-38,0,0],times)},'elbow-right':{rotate:keys([0,-16,14,8,0,0],times)},'hand-right':{rotate:keys([0,-4,-18,6,0,0],times)},weapon:{rotate:keys([0,9,-12,-4,0,0],times)},'arm-left':{rotate:keys([0,-12,18,8,0,0],times)},tail:{rotate:keys([0,-8,10,5,0,0],times)},'tail-tip':{rotate:keys([0,-5,10,7,0,0],times)},'scarf-tip':{rotate:keys([0,-10,16,10,0,0],times)}},events:[{time:.29,name:'strike'}]};
rig.animations.hit={bones:{body:{translate:[{x:0,y:0},{time:.05,x:-17,y:2},{time:.18,x:-8,y:0},{time:.36,x:0,y:0}]},head:{rotate:[{value:0},{time:.05,value:9},{time:.16,value:-3},{time:.36,value:0}]},'ear-left':{rotate:[{value:0},{time:.06,value:-12},{time:.36,value:0}]},'ear-right':{rotate:[{value:0},{time:.06,value:12},{time:.36,value:0}]} }};
rig.animations.happy.bones={root:{translate:[{x:0,y:0},{time:.15,x:0,y:18},{time:.3,x:0,y:0},{time:.5,x:0,y:10},{time:.65,x:0,y:0},{time:1,x:0,y:0}]},head:{rotate:[{value:0},{time:.2,value:-5},{time:.5,value:4},{time:1,value:0}]},'tail-mid':rot(1,8),'tail-tip':rot(1,10)};
rig.events={step:{},strike:{}};rig.skeleton.hash='fox-cocos-weighted-v2';rig.skeleton.images='./images/';
await fs.writeFile(path.join(out,'fox.json'),JSON.stringify(rig,null,2));
await fs.writeFile(path.join(out,'fox.atlas'),(await fs.readFile(path.join(original,'W04.atlas'),'utf8')).replace(/^W04\.png/,'fox.png'));
await fs.copyFile(path.join(original,'W04.png'),path.join(out,'fox.png'));
await fs.cp(path.join(original,'images'),path.join(out,'images'),{recursive:true});
const art=path.join(project,'assets/resources/art');
const input=path.join(art,'props-source.png'),meta=await sharp(input).metadata();
for(const [i,name] of ['dummy','crates','crystal','wisp'].entries()){
 const x=Math.floor(i%2*meta.width/2),y=Math.floor(Math.floor(i/2)*meta.height/2),w=Math.floor(meta.width/2),h=Math.floor(meta.height/2);
 const cell=await sharp(input).extract({left:x,top:y,width:w,height:h}).png().toBuffer();
 await sharp(cell).trim({threshold:25}).png().toFile(path.join(art,name+'.png'));
}
await fs.copyFile(path.join(out,'images/head-neutral.png'),path.join(art,'fox-avatar.png'));
const summary={bones:bones.length,slots:rig.slots.length,meshAttachments:Object.values(parts).flatMap(p=>Object.values(p)).filter(p=>p.type==='mesh').length,animations:Object.keys(rig.animations),weighted:true,source:'Project-owned generated fox artwork; no Cult of the Lamb assets'};
await fs.writeFile(path.join(project,'docs/fox-rig.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
