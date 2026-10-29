// Moves Codex-generated paintings from art-gen/ into assets/resources at game sizes.
// Opaque backgrounds become JPG (small packages); pet portraits get their white
// background removed and are saved as PNG. Re-runnable: it always rebuilds outputs.
// usage (from pet-cocos): node tools/imagegen/import-art.mjs
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const SRC='art-gen',RES='assets/resources';
const jobs=[
 {src:'login-keyart',out:'home/login-keyart.jpg',w:720,h:1280},
 {src:'portal',out:'battle/portal-ring.png',w:256,h:160,cutout:true},
 ...[1,2,3,4,5,6,7,8].map(n=>({src:`stage-ch${n}`,out:`stages/ch${n}.jpg`,w:384,h:240})),
 ...['W01','W04','G01','G02','R01','R02','M01','M02','S01','S02',...Array.from({length:20},(_,i)=>'N'+String(i+1).padStart(2,'0'))].map(id=>({src:`pet-${id}`,out:`pets/portrait/${id}.png`,w:384,h:384,cutout:true})),
];
// flood-fill from the border: pixels close to the corner colour become transparent, with a soft edge
async function cutout(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width:W,height:H}=info;
 const at=(x,y)=>(y*W+x)*4;const bg=[0,0,0];for(const [x,y] of [[2,2],[W-3,2],[2,H-3],[W-3,H-3]]){const i=at(x,y);bg[0]+=data[i]/4;bg[1]+=data[i+1]/4;bg[2]+=data[i+2]/4;}
 const dist=i=>Math.hypot(data[i]-bg[0],data[i+1]-bg[1],data[i+2]-bg[2]);const seen=new Uint8Array(W*H),stack=[];
 for(let x=0;x<W;x++){stack.push(x,0,x,H-1);}for(let y=0;y<H;y++){stack.push(0,y,W-1,y);}
 while(stack.length){const y=stack.pop(),x=stack.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(seen[k])continue;const i=k*4,d=dist(i);if(d>60)continue;seen[k]=1;
  data[i+3]=d<28?0:Math.round(255*(d-28)/32);stack.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 return sharp(data,{raw:{width:W,height:H,channels:4}}).trim({threshold:1});}
let n=0;
for(const j of jobs){const file=path.join(SRC,j.src+'.png');if(!fs.existsSync(file)){console.log('import skip (missing)',j.src);continue;}
 const out=path.join(RES,j.out);fs.mkdirSync(path.dirname(out),{recursive:true});
 if(j.cutout){const img=await cutout(file);const buf=await img.png().toBuffer();await sharp(buf).resize(j.w,j.h,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,palette:true,quality:90}).toFile(out);}
 else await sharp(file).resize(j.w,j.h,{fit:'cover',position:'attention'}).jpeg({quality:82,mozjpeg:true}).toFile(out);
 // new files get a sprite-frame meta so Cocos imports them ready to use (existing metas are kept)
 if(!fs.existsSync(out+'.meta'))fs.writeFileSync(out+'.meta',JSON.stringify({ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'sprite-frame',fixAlphaTransparencyArtifacts:false,hasAlpha:!!j.cutout,...(j.cutout?{trimType:'none'}:{})}},null,2));
 console.log('import ok',j.out,(fs.statSync(out).size/1024).toFixed(0)+'KB');n++;}
console.log('import done',n,'files');
