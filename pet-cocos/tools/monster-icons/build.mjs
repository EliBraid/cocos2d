// Renders every monster as it looks in battle (its painted rig from tools/monster-rig, else the minion skin + tint)
// in its idle pose into a 128px icon for the 图鉴.
// usage (from pet-cocos): node tools/monster-icons/build.mjs   -> assets/resources/battle/mon/<kind>.png
import fs from 'node:fs';import crypto from 'node:crypto';import sharp from 'sharp';import * as spine from '@esotericsoftware/spine-core';
import {MONSTERS,MONSTER_VIEW} from '../../assets/scripts/battle/BattleConfig.ts';
const RIG='assets/resources/battle/minion/minion',OUT='assets/resources/battle/mon',N=128;
class Tex extends spine.Texture{setFilters(){}setWraps(){}dispose(){}}
async function load(rig){const atlas=new spine.TextureAtlas(fs.readFileSync(rig+'.atlas','utf8'));
 const img=await sharp(rig+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});for(const p of atlas.pages)p.setTexture(new Tex({width:img.info.width,height:img.info.height}));
 return {img,data:new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(JSON.parse(fs.readFileSync(rig+'.json','utf8')))};}
const minion=await load(RIG);
fs.mkdirSync(OUT,{recursive:true});
const dirMeta=OUT+'.meta';if(!fs.existsSync(dirMeta))fs.writeFileSync(dirMeta,JSON.stringify({ver:'1.2.0',importer:'directory',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}},null,2));
for(const kind of Object.keys(MONSTERS)){const own=`assets/resources/battle/mon-rig/${kind}/${kind}`,mine=fs.existsSync(own+'.json');
 const {img,data}=mine?await load(own):minion,{width:TW,height:TH}=img.info,tx=img.data;
 const v=MONSTER_VIEW(kind),sk=new spine.Skeleton(data);sk.setSkinByName(mine?'main':v.skin);sk.setSlotsToSetupPose();
 const st=new spine.AnimationState(new spine.AnimationStateData(data));st.setAnimation(0,'idle',true);st.update(.2);st.apply(sk);sk.updateWorldTransform(spine.Physics.update);
 // collect triangles in world space, then fit them into the icon
 const tris=[];for(const slot of sk.drawOrder){const a=slot.getAttachment();let w,uv,tri;
  if(a instanceof spine.MeshAttachment){w=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,a.worldVerticesLength,w,0,2);uv=a.uvs;tri=a.triangles;}
  else if(a instanceof spine.RegionAttachment){w=new Float32Array(8);a.computeWorldVertices(slot,w,0,2);uv=a.uvs;tri=[0,1,2,2,3,0];}else continue;
  const c=slot.color;for(let q=0;q<tri.length;q+=3)tris.push({p:[tri[q],tri[q+1],tri[q+2]].map(n=>[w[n*2],w[n*2+1]]),u:[tri[q],tri[q+1],tri[q+2]].map(n=>[uv[n*2]*TW,uv[n*2+1]*TH]),c});}
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const t of tris)for(const [x,y] of t.p){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const S=(N-12)/Math.max(x1-x0,y1-y0),ox=N/2-(x0+x1)/2*S,oy=N/2+(y0+y1)/2*S,buf=Buffer.alloc(N*N*4),tint=mine?[1,1,1]:v.tint.map(c=>c/255);
 for(const t of tris){const P=t.p.map(([x,y])=>[ox+x*S,oy-y*S]),[[a0,b0],[a1,b1],[a2,b2]]=P,d=(b1-b2)*(a0-a2)+(a2-a1)*(b0-b2);if(Math.abs(d)<1e-9)continue;
  for(let y=Math.max(0,Math.floor(Math.min(b0,b1,b2)));y<=Math.min(N-1,Math.ceil(Math.max(b0,b1,b2)));y++)for(let x=Math.max(0,Math.floor(Math.min(a0,a1,a2)));x<=Math.min(N-1,Math.ceil(Math.max(a0,a1,a2)));x++){
   const px=x+.5,py=y+.5,l0=((b1-b2)*(px-a2)+(a2-a1)*(py-b2))/d,l1=((b2-b0)*(px-a2)+(a0-a2)*(py-b2))/d,l2=1-l0-l1;if(l0<-1e-4||l1<-1e-4||l2<-1e-4)continue;
   const u=Math.min(TW-1,Math.max(0,Math.floor(l0*t.u[0][0]+l1*t.u[1][0]+l2*t.u[2][0]))),vv=Math.min(TH-1,Math.max(0,Math.floor(l0*t.u[0][1]+l1*t.u[1][1]+l2*t.u[2][1])));
   const si=(vv*TW+u)*4,al=tx[si+3]/255*t.c.a;if(!al)continue;const di=(y*N+x)*4,ba=buf[di+3]/255,oa=al+ba*(1-al);
   for(let k=0;k<3;k++){const col=tx[si+k]*tint[k]*[t.c.r,t.c.g,t.c.b][k];buf[di+k]=Math.round((col*al+buf[di+k]*ba*(1-al))/oa);}buf[di+3]=Math.round(oa*255);}}
 const out=`${OUT}/${kind}.png`;await sharp(buf,{raw:{width:N,height:N,channels:4}}).png().toFile(out);
 if(!fs.existsSync(out+'.meta'))fs.writeFileSync(out+'.meta',JSON.stringify({ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'sprite-frame',fixAlphaTransparencyArtifacts:false,hasAlpha:true,trimType:'none'}},null,2));}
console.log('monster icons',Object.keys(MONSTERS).length);
