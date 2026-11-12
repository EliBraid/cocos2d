// Cuts the Codex-painted 4x4 effects sheet (art-gen/fx/fx-sheet.png, laid out like grid.png) into battle effect sprites.
// usage (from pet-cocos): node tools/fx-art/build.mjs   -> assets/resources/battle/fx/<name>.png
import fs from 'node:fs';import crypto from 'node:crypto';import sharp from 'sharp';
// reading order of the sheet; projectiles are painted pointing right
export const FX=['arrow','star','fireball','thorn','orb','spark','slash','boom','heal','shield','ice','bolt','circle','meteor','shout','vines'];
const SRC='art-gen/fx/fx-sheet.png',OUT='assets/resources/battle/fx',MAX=192;
const buf=fs.readFileSync(SRC),meta=await sharp(buf).metadata(),cw=meta.width/4,ch=meta.height/4;
fs.mkdirSync(OUT,{recursive:true});
const dm=OUT+'.meta';if(!fs.existsSync(dm))fs.writeFileSync(dm,JSON.stringify({ver:'1.2.0',importer:'directory',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}},null,2));
for(const [i,name] of FX.entries()){const ins=Math.round(cw*.04),left=Math.round((i%4)*cw)+ins,top=Math.round(Math.floor(i/4)*ch)+ins,W=Math.round(cw)-2*ins,H=Math.round(ch)-2*ins;
 const {data}=await sharp(buf).extract({left,top,width:W,height:H}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // flood the near-white background from the border (also eats the grey cell frame), soften only the rim
 const white=k=>Math.min(data[k],data[k+1],data[k+2]),grey=k=>Math.max(data[k],data[k+1],data[k+2])-white(k)<12&&white(k)>190;
 const bg=new Uint8Array(W*H),st=[];for(let x=0;x<W;x++)st.push(x,0,x,H-1);for(let y=0;y<H;y++)st.push(0,y,W-1,y);
 while(st.length){const y=st.pop(),x=st.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(bg[k])continue;const i4=k*4;if(white(i4)<215&&!grey(i4))continue;bg[k]=1;st.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 for(let k=0;k<W*H;k++){const i4=k*4;if(bg[k]){data[i4+3]=0;continue;}const x=k%W,y=(k/W)|0,rim=(x>0&&bg[k-1])||(x<W-1&&bg[k+1])||(y>0&&bg[k-W])||(y<H-1&&bg[k+W]),w=white(i4);data[i4+3]=rim&&w>200?Math.round(255*(255-w)/55):255;}
 const out=`${OUT}/${name}.png`;
 await sharp(await sharp(data,{raw:{width:W,height:H,channels:4}}).trim({threshold:1}).png().toBuffer()).resize(MAX,MAX,{fit:'inside'}).png({compressionLevel:9}).toFile(out);
 if(!fs.existsSync(out+'.meta'))fs.writeFileSync(out+'.meta',JSON.stringify({ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'sprite-frame',fixAlphaTransparencyArtifacts:false,hasAlpha:true,trimType:'none'}},null,2));}
console.log('fx sprites',FX.length);
