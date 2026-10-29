import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const project=fileURLToPath(new URL('../',import.meta.url)),source=path.join(project,'source-assets/forest-v03'),art=path.join(project,'assets/proto/forest/art'),parts=path.join(source,'fox-parts');
await Promise.all([fs.mkdir(source,{recursive:true}),fs.mkdir(art,{recursive:true}),fs.mkdir(parts,{recursive:true})]);
const generated='C:/Users/111/.codex/generated_images/01a16147-f153-7a13-a722-6a75b2d220dd';
const input={ground:'exec-7ab92ea9-d613-4260-8c2e-6a302c92ec88.png',plants:'exec-ed527b27-12ab-4239-b6b7-b26db1e7495c.png',props:'exec-3f9bd29c-f489-4ddf-b4ca-9e444d0840df.png',front:'exec-b38ffb5a-3f1a-4ed3-b746-517fda995d46.png',back:'exec-916c014f-b038-4dd3-9f41-41e7cf87d317.png'};
for(const [name,file] of Object.entries(input)){const dest=path.join(source,name+'.png');try{await fs.access(dest);}catch{await fs.copyFile(path.join(generated,file),dest);}}
await fs.copyFile(path.join(source,'ground.png'),path.join(art,'ground.png'));
// Connected components keep oversized cutouts intact when AI atlas cells are
// imperfect. This is deterministic asset separation, with no painted pixels.
async function separate(file,regions,out){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n);labels.fill(-1);
  const components=[];
  for(let seed=0;seed<n;seed++){if(labels[seed]!==-1||data[seed*4+3]<20)continue;let head=0,tail=1,area=0,sx=0,sy=0;queue[0]=seed;labels[seed]=components.length;
    while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;area++;sx+=x;sy+=y;for(const q of [x>0?p-1:-1,x+1<w?p+1:-1,y>0?p-w:-1,y+1<h?p+w:-1])if(q>=0&&labels[q]===-1&&data[q*4+3]>=20){labels[q]=components.length;queue[tail++]=q;}}
    components.push({area,cx:sx/area/w,cy:sy/area/h});
  }
  const ownership=components.map(c=>{if(c.area<4)return -1;let best=0,score=Infinity;regions.forEach((r,i)=>{const d=(c.cx-r.x)**2+(c.cy-r.y)**2;if(d<score){score=d;best=i;}});return best;});
  const pixelOwner=new Int16Array(n);pixelOwner.fill(-1);for(let i=0;i<n;i++)if(labels[i]>=0)pixelOwner[i]=ownership[labels[i]];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(pixelOwner[p]>=0||data[p*4+3]===0)continue;for(const q of [p-1,p+1,p-w,p+w])if(pixelOwner[q]>=0){pixelOwner[p]=pixelOwner[q];break;}}
  const manifest=[];
  for(let index=0;index<regions.length;index++){
    let minX=w,minY=h,maxX=-1,maxY=-1;const rgba=Buffer.alloc(w*h*4);
    for(let p=0;p<n;p++)if(pixelOwner[p]===index){data.copy(rgba,p*4,p*4,p*4+4);const x=p%w,y=(p/w)|0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    if(maxX<0)throw Error('Missing cutout '+regions[index].name);minX=Math.max(0,minX-2);minY=Math.max(0,minY-2);maxX=Math.min(w-1,maxX+2);maxY=Math.min(h-1,maxY+2);
    const bounds={left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1};await sharp(rgba,{raw:{width:w,height:h,channels:4}}).extract(bounds).png().toFile(path.join(out,regions[index].name+'.png'));manifest.push({name:regions[index].name,bounds});
  }return manifest;
}
const frontNames=['head','ear-left','ear-right','torso','upper-left','upper-right','fore-left','fore-right','leg-left','leg-right','tail','scarf','knot','eyes-open','eyes-closed','mouth'];
const fronts=frontNames.map((name,i)=>({name,x:[.15,.4,.62,.875,.14,.39,.62,.87,.13,.37,.64,.875,.13,.375,.625,.88][i],y:i<4?.17:i<8?.414:i<12?.64:.885}));
const frontFile=await fs.access(path.join(source,'front-clean.png')).then(()=>path.join(source,'front-clean.png')).catch(()=>path.join(source,'front.png'));
const backFile=await fs.access(path.join(source,'back-clean.png')).then(()=>path.join(source,'back-clean.png')).catch(()=>path.join(source,'back.png'));
const manifest={front:await separate(frontFile,fronts,parts),back:await separate(backFile,[{name:'head-back',x:.25,y:.28},{name:'torso-back',x:.75,y:.37},{name:'tail-back',x:.25,y:.76},{name:'legs-back',x:.75,y:.76}],parts),plants:await separate(path.join(source,'plants.png'),[{name:'tree-left',x:.25,y:.28},{name:'tree-right',x:.75,y:.28},{name:'grass',x:.25,y:.78},{name:'fern',x:.75,y:.78}],art),props:await separate(path.join(source,'props.png'),[{name:'torch',x:.24,y:.28},{name:'rocks',x:.75,y:.35},{name:'flame-a',x:.25,y:.78},{name:'flame-b',x:.75,y:.78}],art)};
const back=await sharp(path.join(parts,'legs-back.png')).metadata();
for(const [i,name] of ['leg-left-back','leg-right-back'].entries()){const buffer=await sharp(path.join(parts,'legs-back.png')).extract({left:Math.floor(i*back.width/2),top:0,width:Math.floor(back.width/2),height:back.height}).png().toBuffer();await sharp(buffer).trim({threshold:10}).png().toFile(path.join(parts,name+'.png'));}
await fs.copyFile(path.join(project,'source-assets/fox-v1/images/weapon.png'),path.join(parts,'weapon.png'));
await fs.writeFile(path.join(source,'cutout-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({parts:manifest.front.length+manifest.back.length+2,environment:manifest.plants.length+manifest.props.length,source}));
