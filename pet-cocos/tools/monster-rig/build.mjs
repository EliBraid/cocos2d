// Turns a Codex-painted monster parts sheet (laid out like template.png) into its own Spine skeleton that keeps the
// minion rig's bones, slots, attachment names and animations, so BattleSlice plays it exactly like the old minion.
// usage (from pet-cocos): node tools/monster-rig/build.mjs [kind ...]   -> assets/resources/battle/mon-rig/<kind>/
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const RIG='assets/resources/battle/minion/minion.json',OUTDIR='assets/resources/battle/mon-rig';
const T=JSON.parse(fs.readFileSync('tools/monster-rig/template.json','utf8')),base=JSON.parse(fs.readFileSync(RIG,'utf8'));
const fuzz=base.skins.find(s=>s.name==='fuzz').attachments,UNIT_PX=T.scale*2; // template px per skeleton unit (atlas is 2 px/unit)
const bone=n=>base.bones.find(b=>b.name===n);
// keep the painted size, clamped around the 毛球怪 part so every monster still fits the rig
const RANGE={body:[.85,1.3],top:[.6,1.6],'face-angry':[.8,1.25],'face-hurt':[.8,1.25],'foot-left':[.8,1.4],'foot-right':[.8,1.4]};

async function cutCell(sheet,[cx,cy,cw,ch]){
 const sx=sheet.info.width/T.sheet[0],sy=sheet.info.height/T.sheet[1],ins=10;
 const left=Math.round((cx+ins)*sx),top=Math.round((cy+ins)*sy),W=Math.round((cw-2*ins)*sx),H=Math.round((ch-2*ins)*sy);
 const {data}=await sharp(sheet.buf).extract({left,top,width:W,height:H}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const white=i=>Math.min(data[i],data[i+1],data[i+2]);const bg=new Uint8Array(W*H),stack=[];
 for(let x=0;x<W;x++)stack.push(x,0,x,H-1);for(let y=0;y<H;y++)stack.push(0,y,W-1,y);
 while(stack.length){const y=stack.pop(),x=stack.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(bg[k])continue;if(white(k*4)<215)continue;bg[k]=1;stack.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 let n=0;for(let k=0;k<W*H;k++){const i=k*4;if(bg[k]){data[i+3]=0;continue;}n++;
  const x=k%W,y=(k/W)|0,rim=(x>0&&bg[k-1])||(x<W-1&&bg[k+1])||(y>0&&bg[k-W])||(y<H-1&&bg[k+W]),w=white(i);data[i+3]=rim&&w>200?Math.round(255*(255-w)/55):255;}
 if(n<200)return null;
 const {data:d2,info}=await sharp(data,{raw:{width:W,height:H,channels:4}}).trim({threshold:1}).raw().toBuffer({resolveWithObject:true});
 return {raw:d2,w:info.width,h:info.height,sx};}

async function build(kind){const file=`art-gen/monsters/parts-${kind}.png`;if(!fs.existsSync(file)){console.log('skip',kind);return;}
 const sheet={buf:fs.readFileSync(file)};sheet.info=await sharp(sheet.buf).metadata();
 const parts={};
 for(const [name,cell] of Object.entries(T.cells)){const cut=await cutCell(sheet,cell);if(!cut)continue;
  const slot=name.startsWith('face')?'face':name,ref=fuzz[slot][name.startsWith('face')?name:Object.keys(fuzz[slot])[0]];
  const pw=cut.w/cut.sx/UNIT_PX,ph=cut.h/cut.sx/UNIT_PX,fit=Math.min(ref.width/pw,ref.height/ph),[lo,hi]=RANGE[name],k=Math.max(fit*lo,Math.min(fit*hi,1));
  parts[name]={cut,w:pw*k,h:ph*k,ref};}
 if(!parts.body){console.log('FAIL no body',kind);return;}
 // placement in each slot's bone space: body sits on the ground, the top sinks 60% into the body's top, the face scales with the body
 const B=parts.body,bodyBottom=fuzz.body.body.y-fuzz.body.body.height/2,bodyTop=bodyBottom+B.h,topBone=bone('top').y,faceBone=bone('face').y;
 const place={body:[0,bodyBottom+B.h/2],top:parts.top?[0,bodyTop-topBone-.1*parts.top.h]:null,'foot-left':[0,0],'foot-right':[0,0]};
 for(const f of ['face-angry','face-hurt'])if(parts[f])place[f]=[0,(faceBone+parts[f].ref.y)*B.h/fuzz.body.body.height-faceBone];
 // atlas: parts rendered at 2 px per unit, packed on a power-of-two page
 const imgs=[];for(const [name,P] of Object.entries(parts)){const pw=Math.max(1,Math.round(P.w*2)),ph=Math.max(1,Math.round(P.h*2));
  imgs.push({name,pw,ph,buf:await sharp(P.cut.raw,{raw:{width:P.cut.w,height:P.cut.h,channels:4}}).resize(pw,ph).png().toBuffer()});}
 imgs.sort((a,b)=>b.ph-a.ph);const PAD=2,PW=512;let x=PAD,y=PAD,row=0;for(const im of imgs){if(x+im.pw+PAD>PW){x=PAD;y+=row+PAD;row=0;}im.ax=x;im.ay=y;x+=im.pw+PAD;row=Math.max(row,im.ph);}
 let PH=1;while(PH<y+row+PAD)PH*=2;
 const dir=path.join(OUTDIR,kind);fs.mkdirSync(dir,{recursive:true});
 await sharp({create:{width:PW,height:PH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(imgs.map(im=>({input:im.buf,left:im.ax,top:im.ay}))).png({compressionLevel:9,palette:true,quality:92,dither:.6,effort:10}).toFile(path.join(dir,kind+'.png'));
 fs.writeFileSync(path.join(dir,kind+'.atlas'),`${kind}.png\nsize: ${PW}, ${PH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+imgs.map(im=>`${im.name}\nbounds: ${im.ax}, ${im.ay}, ${im.pw}, ${im.ph}\n`).join(''));
 const att={};const put=(slot,key,name)=>{if(!parts[name]||!place[name])return;const [ax,ay]=place[name];(att[slot]??={})[key]={path:name,x:+ax.toFixed(2),y:+ay.toFixed(2),width:+parts[name].w.toFixed(2),height:+parts[name].h.toFixed(2)};};
 put('body','body','body');put('top','top','top');put('face','face-angry','face-angry');put('face','face-hurt','face-hurt');put('foot-left','foot','foot-left');put('foot-right','foot','foot-right');
 const json={...base,skeleton:{...base.skeleton,hash:`mon-${kind}-v1`},skins:[{name:'default',attachments:att},{name:'main',attachments:att}]};
 fs.writeFileSync(path.join(dir,kind+'.json'),JSON.stringify(json));
 const meta=(f,o)=>{if(!fs.existsSync(f))fs.writeFileSync(f,JSON.stringify(o,null,2));return JSON.parse(fs.readFileSync(f,'utf8')).uuid;};
 const dirMeta=f=>meta(f,{ver:'1.2.0',importer:'directory',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
 dirMeta(OUTDIR+'.meta');dirMeta(dir+'.meta');
 meta(path.join(dir,kind+'.png.meta'),{ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'texture',hasAlpha:true}});
 const atlas=meta(path.join(dir,kind+'.atlas.meta'),{ver:'1.0.0',importer:'*',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
 meta(path.join(dir,kind+'.json.meta'),{ver:'1.2.7',importer:'spine-data',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{atlasUuid:atlas}});
 console.log('monster',kind,Object.keys(parts).length,'parts',`${PW}x${PH}`);}

const want=process.argv.slice(2);const kinds=want.length?want:fs.readdirSync('art-gen/monsters').map(f=>f.match(/^parts-(.+)\.png$/)?.[1]).filter(Boolean);
for(const k of kinds)await build(k);
