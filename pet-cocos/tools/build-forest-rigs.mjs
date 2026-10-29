import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';import {worldBones,weightedMesh} from './mesh.mjs';
const project=fileURLToPath(new URL('../',import.meta.url)),parts=path.join(project,'source-assets/forest-v03/fox-parts'),out=path.join(project,'assets/proto/forest/fox');await fs.mkdir(out,{recursive:true});
async function atlas(folder,names,destination,page='atlas.png'){
 const sprites=[];let x=4,y=4,row=0;for(const name of names){const file=path.join(folder,name+'.png'),m=await sharp(file).metadata();if(x+m.width+4>2048){x=4;y+=row+4;row=0;}sprites.push({name,file,x,y,w:m.width,h:m.height});x+=m.width+4;row=Math.max(row,m.height);}
 const height=2**Math.ceil(Math.log2(y+row+4));await sharp({create:{width:2048,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(sprites.map(s=>({input:s.file,left:s.x,top:s.y}))).png().toFile(path.join(destination,page));
 let text=`${page}\nsize: 2048, ${height}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`;for(const s of sprites)text+=`${s.name}\nbounds: ${s.x}, ${s.y}, ${s.w}, ${s.h}\noffsets: 0, 0, ${s.w}, ${s.h}\nrotate: false\nindex: -1\n`;return text;
}
await sharp({create:{width:2,height:2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(path.join(parts,'empty.png'));
const names=(await fs.readdir(parts)).filter(n=>n.endsWith('.png')&&n!=='legs-back.png').map(n=>n.slice(0,-4));await fs.writeFile(path.join(out,'fox.atlas'),await atlas(parts,names,out,'fox.png'));
const bones=[];const add=(name,parent,x=0,y=0)=>{bones.push({name,...(parent?{parent}:{}),x,y});};
add('root',null);add('hips','root',0,118);add('chest','hips',0,103);add('neck','chest',0,55);add('head','neck',0,84);add('head-top','head',0,75);add('ear-left','head',-76,40);add('ear-right','head',76,40);add('gaze','head',10,-8);add('mouth','head',22,-57);
add('leg-left','hips',-43,-4);add('shin-left','leg-left',0,-43);add('paw-left','shin-left',0,-43);add('leg-right','hips',43,-4);add('shin-right','leg-right',0,-43);add('paw-right','shin-right',0,-43);
add('arm-left','chest',-67,15);add('fore-left','arm-left',-25,-49);add('arm-right','chest',67,15);add('fore-right','arm-right',25,-49);add('hand-right','fore-right',-8,-47);add('weapon','hand-right',7,-1);
add('tail','hips',-55,-2);add('tail-mid','tail',-95,50);add('tail-tip','tail-mid',-55,65);add('scarf','neck',-49,3);add('scarf-mid','scarf',-65,13);add('scarf-tip','scarf-mid',-55,17);
const matrices=worldBones(bones),index=n=>bones.findIndex(b=>b.name===n),skin={},slots=[];
const chain=(list,t)=>{const p=Math.max(0,Math.min(1,t))*(list.length-1);return list.map((name,i)=>[index(name),Math.max(0,1-Math.abs(p-i))]);};
function attach(slot,bone,file,w,h,x=0,y=0,weights=null,segments=7){slots.push({name:slot,bone,attachment:slot});const r={path:file,x,y,width:w,height:h};skin[slot]={[slot]:weights?weightedMesh(r,index(bone),matrices,weights,segments):r};}
attach('tail','tail','tail',240,210,-90,45,(u,v)=>chain(['tail','tail-mid','tail-tip'],(1-u)*.7+(1-v)*.3),9);
for(const side of ['left','right'])attach('leg-'+side,'leg-'+side,'leg-'+side,85,138,0,-45,(u,v)=>chain(['leg-'+side,'shin-'+side,'paw-'+side],v),6);
attach('torso','chest','torso',166,188,0,-15,(u,v)=>chain(['hips','chest','neck'],1-v),8);
attach('arm-left','arm-left','upper-left',70,85,-18,-27,(u,v)=>chain(['arm-left','fore-left'],v));attach('fore-left','fore-left','fore-left',67,90,11,-28);
attach('arm-right','arm-right','upper-right',70,85,18,-27,(u,v)=>chain(['arm-right','fore-right'],v));attach('fore-right','fore-right','fore-right',67,90,-11,-28);
attach('weapon','weapon','weapon',90,176,31,70);
attach('scarf','scarf','scarf',176,84,-59,21,(u,v)=>chain(['scarf','scarf-mid','scarf-tip'],1-u),9);
attach('knot','neck','knot',183,79,0,-18);
attach('head','head','head',270,230,0,0,(u,v)=>chain(['head','head-top'],Math.max(0,(.7-v)/.7)),9);
attach('ear-left','ear-left','ear-left',94,127,-20,45,(u,v)=>[[index('ear-left'),1]],6);attach('ear-right','ear-right','ear-right',94,127,20,45,(u,v)=>[[index('ear-right'),1]],6);
attach('eyes','gaze','eyes-open',150,78,0,0);skin.eyes['eyes-closed']={path:'eyes-closed',x:0,y:-14,width:150,height:24};
attach('mouth','mouth','mouth',65,43);
const back=structuredClone(skin);
function replace(slot,file,w,h,x,y,weights=null){const r={path:file,width:w,height:h,x,y};back[slot][slot]=weights?weightedMesh(r,index(slots.find(s=>s.name===slot).bone),matrices,weights,8):r;}
replace('head','head-back',300,310,0,38,(u,v)=>{const l=Math.max(0,(.38-u)/.38)*Math.max(0,(.5-v)/.5),r=Math.max(0,(u-.62)/.38)*Math.max(0,(.5-v)/.5);return [[index('head'),1-l-r],[index('ear-left'),l],[index('ear-right'),r]];});
replace('torso','torso-back',255,236,44,10,(u,v)=>chain(['hips','chest','neck'],1-v));replace('tail','tail-back',225,222,-75,42,(u,v)=>chain(['tail','tail-mid','tail-tip'],(1-u)*.7+(1-v)*.3));
replace('leg-left','leg-left-back',85,136,0,-45,(u,v)=>chain(['leg-left','shin-left','paw-left'],v));replace('leg-right','leg-right-back',85,136,0,-45,(u,v)=>chain(['leg-right','shin-right','paw-right'],v));
for(const slot of ['eyes','mouth','ear-left','ear-right','knot','scarf']){for(const key of Object.keys(back[slot]))back[slot][key]={path:'empty',width:1,height:1};}
const round=v=>Math.round(v*1e5)/1e5;
const wave=(duration,amplitude,phase=0,n=24)=>Array.from({length:n+1},(_,i)=>({time:round(duration*i/n),value:round(amplitude*Math.sin(i/n*Math.PI*2+phase))}));
const rotate=(duration,amp,phase=0)=>({rotate:wave(duration,amp,phase)});
const key=(times,values)=>times.map((time,i)=>({time,value:values[i]}));
const animations={};
animations.idle={bones:{hips:{translate:wave(5.2,1.2).map(k=>({time:k.time,x:0,y:k.value}))},chest:rotate(5.2,.6),head:{rotate:[{value:0},{time:1.3,value:0},{time:1.8,value:-2.5},{time:2.5,value:-2.5},{time:3.1,value:2.5},{time:4,value:0},{time:5.2,value:0}]},tail:rotate(5.2,1.8,.2),'tail-mid':rotate(5.2,3.4,-.3),'tail-tip':rotate(5.2,6,-.7),'scarf-mid':rotate(5.2,2,.4),'scarf-tip':rotate(5.2,4,-.15),'ear-left':{rotate:[{value:0},{time:2.45,value:0},{time:2.53,value:7},{time:2.65,value:-3},{time:2.88,value:0},{time:5.2,value:0}]},'ear-right':rotate(5.2,1.5,.8)}};
animations.walk={bones:{hips:{translate:wave(.76,1.8,0,32).map(k=>({time:k.time,x:0,y:Math.abs(k.value)*1.7}))},chest:rotate(.76,1.2),head:rotate(.76,1,-.6),tail:rotate(.76,2,.2),'tail-mid':rotate(.76,4,-.4),'tail-tip':rotate(.76,7,-.9),'scarf-mid':rotate(.76,4,.4),'scarf-tip':rotate(.76,7,-.2),'arm-left':rotate(.76,8,Math.PI/2),'arm-right':rotate(.76,6,-Math.PI/2),'fore-left':rotate(.76,3),'fore-right':rotate(.76,3,.3),'ear-left':rotate(.76,2,.4),'ear-right':rotate(.76,2,.6)},events:[{time:.08,name:'step'},{time:.46,name:'step'}]};
for(const [side,phase] of [['left',Math.PI/2],['right',-Math.PI/2]]){animations.walk.bones['leg-'+side]=rotate(.76,13,phase);animations.walk.bones['shin-'+side]=rotate(.76,5,phase-.5);animations.walk.bones['paw-'+side]={translate:wave(.76,6,phase,32).map(k=>({time:k.time,x:0,y:Math.max(0,k.value)})),...rotate(.76,4,phase+.5)};}
animations.start={bones:{chest:{rotate:key([0,.07,.14],[0,-4,0])},hips:{translate:[{x:0,y:0},{time:.07,x:-3,y:-3},{time:.14,x:0,y:0}]} }};
animations.stop={bones:{chest:{rotate:key([0,.07,.18],[3,-2,0])},head:{rotate:key([0,.07,.18],[-2,2,0])}}};
animations.turn={bones:{hips:{scale:[{x:1,y:1},{time:.08,x:.84,y:1.03},{time:.16,x:1,y:1}]}}};
const t=[0,.18,.34,.46,.7,.9];animations.attack={bones:{hips:{translate:[{x:0,y:0},{time:.18,x:-11,y:-6},{time:.34,x:18,y:2},{time:.46,x:10,y:-1},{time:.7,x:0,y:0},{time:.9,x:0,y:0}]},chest:{rotate:key(t,[0,-7,9,6,0,0])},head:{rotate:key(t,[0,-3,4,2,0,0])},'arm-right':{rotate:key(t,[0,61,-75,-40,0,0])},'fore-right':{rotate:key(t,[0,-18,22,6,0,0])},weapon:{rotate:key(t,[0,12,-20,-3,0,0])},'arm-left':{rotate:key(t,[0,-12,18,6,0,0])},'tail-mid':{rotate:key(t,[0,-10,9,8,0,0])},'tail-tip':{rotate:key(t,[0,-4,14,9,0,0])},'scarf-tip':{rotate:key(t,[0,-4,16,12,0,0])}},events:[{time:.34,name:'strike'}]};
animations.hit={bones:{hips:{translate:[{x:0,y:0},{time:.05,x:-15,y:-3},{time:.16,x:-8,y:0},{time:.42,x:0,y:0}]},head:{rotate:key([0,.06,.17,.42],[0,9,-3,0])},'ear-left':{rotate:key([0,.07,.42],[0,-14,0])},'ear-right':{rotate:key([0,.07,.42],[0,12,0])}}};
animations.happy={bones:{hips:{translate:[{x:0,y:0},{time:.13,x:0,y:-7},{time:.28,x:0,y:20},{time:.43,x:0,y:0},{time:.6,x:0,y:10},{time:.75,x:0,y:0},{time:1.2,x:0,y:0}]},head:{rotate:key([0,.25,.5,.8,1.2],[0,-5,4,-2,0])},'tail-mid':rotate(1.2,10),'tail-tip':rotate(1.2,14,-.5),'ear-left':{rotate:key([0,.2,.7,1.2],[0,-8,-4,0])},'ear-right':{rotate:key([0,.2,.7,1.2],[0,8,4,0])}}};
animations.sniff={bones:{neck:{translate:[{x:0,y:0},{time:.25,x:7,y:-8},{time:.5,x:4,y:-7},{time:.7,x:8,y:-8},{time:1.15,x:0,y:0}]},head:{rotate:key([0,.25,.5,.7,1.15],[0,-6,-4,-6,0])},'ear-right':{rotate:key([0,.28,.4,.55,1.15],[0,8,-2,4,0])}}};
animations.sleep={bones:{chest:{translate:[{x:0,y:-25},{time:2,x:0,y:-23},{time:4,x:0,y:-25}],rotate:[{value:-8},{time:4,value:-8}]},head:{rotate:[{value:-15},{time:2,value:-13},{time:4,value:-15}]},'tail-mid':rotate(4,1),'tail-tip':rotate(4,2)}};
animations.wake={bones:{chest:{translate:[{x:0,y:-25},{time:.25,x:0,y:6},{time:.45,x:0,y:0}]},head:{rotate:key([0,.25,.45],[-15,4,0])},'ear-left':{rotate:key([0,.25,.45],[-8,5,0])}}};
animations['face-calm']={slots:{eyes:{attachment:[{name:'eyes'},{time:2.8,name:'eyes-closed'},{time:2.91,name:'eyes'},{time:5.2,name:'eyes'}]}},bones:{gaze:{scale:[{x:1,y:1},{time:5.2,x:1,y:1}]},mouth:{scale:[{x:1,y:1},{time:5.2,x:1,y:1}]}}};
animations['face-happy']={slots:{eyes:{attachment:[{name:'eyes-closed'},{time:1.2,name:'eyes-closed'}]}},bones:{mouth:{scale:[{x:1.13,y:1.07},{time:1.2,x:1.13,y:1.07}]}}};
animations['face-focus']={slots:{eyes:{attachment:[{name:'eyes'},{time:.9,name:'eyes'}]}},bones:{gaze:{scale:[{x:1,y:.75},{time:.9,x:1,y:.75}]}}};
animations['face-alert']={slots:{eyes:{attachment:[{name:'eyes'},{time:.42,name:'eyes'}]}},bones:{gaze:{scale:[{x:1.1,y:1.08},{time:.42,x:1,y:1}]}}};
animations['face-sleep']={slots:{eyes:{attachment:[{name:'eyes-closed'},{time:4,name:'eyes-closed'}]}},bones:{mouth:{scale:[{x:.9,y:.9},{time:4,x:.9,y:.9}]}}};
for(const [name,x] of [['look-left',-5],['look-right',5],['look-center',0]])animations[name]={bones:{gaze:{translate:[{x,y:0},{time:1,x,y:0}]}}};
function deformation(mesh,amount){const values=[];let cursor=0,vertex=0;while(cursor<mesh.vertices.length){const n=mesh.vertices[cursor++],u=mesh.uvs[vertex*2],v=mesh.uvs[vertex*2+1];for(let j=0;j<n;j++){cursor+=4;values.push(round((u-.5)*amount*Math.sin(Math.PI*v)),round(Math.sin(Math.PI*u)*amount*.1));}vertex++;}return values;}
animations.idle.attachments={};for(const [name,skinData] of [['default',skin],['back',back]])animations.idle.attachments[name]={torso:{torso:{deform:[{}, {time:2.6,vertices:deformation(skinData.torso.torso,3.5)},{time:5.2}]}}};
const rig={skeleton:{hash:'forest-fox-v03',spine:'4.2.73',x:-320,y:-40,width:640,height:640,images:'./images/'},bones,slots,skins:[{name:'default',attachments:skin},{name:'back',attachments:back}],events:{step:{},strike:{}},animations};
await fs.writeFile(path.join(out,'fox.json'),JSON.stringify(rig,null,2));
const fireOut=path.join(project,'assets/proto/forest/fire');await fs.mkdir(fireOut,{recursive:true});const art=path.join(project,'assets/proto/forest/art');await fs.writeFile(path.join(fireOut,'fire.atlas'),await atlas(art,['flame-a','flame-b'],fireOut,'fire.png'));
const fb=[{name:'root'},{name:'base',parent:'root'},{name:'mid',parent:'base',y:85},{name:'tip',parent:'mid',y:90}],fm=worldBones(fb);const flame=weightedMesh({path:'flame-a',x:0,y:112,width:145,height:225},1,fm,(u,v)=>{const p=(1-v)*2;return [[1,Math.max(0,1-p)],[2,Math.max(0,1-Math.abs(p-1))],[3,Math.max(0,p-1)]];},8),flameB=structuredClone(flame);flameB.path='flame-b';
const fire={skeleton:{spine:'4.2.73',hash:'forest-fire-v03',width:256,height:256},bones:fb,slots:[{name:'flame',bone:'base',attachment:'a'}],skins:[{name:'default',attachments:{flame:{a:flame,b:flameB}}}],animations:{burn:{bones:{base:{scale:[{x:1,y:1},{time:.22,x:.94,y:1.08},{time:.46,x:1.06,y:.97},{time:.7,x:.98,y:1.04},{time:.9,x:1,y:1}]},mid:rotate(.9,5),tip:rotate(.9,12,-.7)},slots:{flame:{attachment:[{name:'a'},{time:.32,name:'b'},{time:.6,name:'a'},{time:.9,name:'a'}]}}}}};
await fs.writeFile(path.join(fireOut,'fire.json'),JSON.stringify(fire,null,2));
const report={bones:bones.length,slots:slots.length,skins:2,weightedMeshes:Object.values(skin).flatMap(a=>Object.values(a)).filter(a=>a.type==='mesh').length,animations:Object.keys(animations),hasDeformTimeline:true,separateFaceParts:true,backView:true,fire:'native Spine 4.2 weighted flame'};await fs.writeFile(path.join(project,'docs/forest-v03-rig.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
