import fs from 'node:fs/promises';import sharp from 'sharp';import {organicMesh} from './organic-mesh.mjs';
// Isolate the painted legs behind the chest fur. Each leg gets its own mesh,
// so crossing feet cannot fold triangles across the transparent crotch.
export async function splitWalkSilhouettes(rig,regions,bind,parts){
 const idx=name=>rig.bones.findIndex(b=>b.name===name),clamp=t=>Math.max(0,Math.min(1,t));
 for(const view of ['front','back']){const r=regions[view],{data,info}=await sharp(parts+'/body-'+view+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),ranges=[];
  for(let y=0;y<info.height;y++){let lo=info.width,hi=-1;if(y>info.height*.43&&y<info.height*.76)for(let x=Math.floor(info.width*.24);x<info.width*.9;x++){const k=(y*info.width+x)*4;if(data[k+3]>100&&data[k]>185&&data[k+1]>145&&data[k+2]>110){lo=Math.min(lo,x);hi=Math.max(hi,x);}}ranges.push([lo-7,hi+7]);}
  const mid=(r.paws[0].x+r.paws[1].x)/2,split=(.5+(mid-r.x)/r.width)*info.width;
  r.layers={};
  for(const part of ['torso','left','right']){const copy=Buffer.from(data);let minX=info.width,minY=info.height,maxX=0,maxY=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const k=(y*info.width+x)*4,[lo,hi]=ranges[y],chest=hi>=lo&&x>=lo&&x<=hi,top=y<info.height*.44;const keep=part==='torso'?(top||chest):y>info.height*.405&&(part==='left'?x<split:x>=split)&&(!chest||top);if(!keep)copy[k+3]=0;if(copy[k+3]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}const width=maxX-minX+1,height=maxY-minY+1;r.layers[part]={path:`walk-${part}-${view}`,x:r.x+(minX+width/2-info.width/2)*r.width/info.width,y:r.y+(info.height/2-minY-height/2)*r.height/info.height,width:r.width*width/info.width,height:r.height*height/info.height};await sharp(copy,{raw:info}).extract({left:minX,top:minY,width,height}).png().toFile(parts+`/walk-${part}-${view}.png`);}
  const mesh=part=>{const layer=r.layers[part];return organicMesh(layer,0,bind[view],(u,v)=>{const y=layer.y+(.5-v)*layer.height;if(part==='torso'){const n=['hips','back-btm','back-top','neck'],p=clamp((y-96)/114)*3;return n.map((b,i)=>[idx(b),Math.max(0,1-Math.abs(p-i))]);}const t=clamp((117-y)/74),w=t*t*(3-2*t);return [[idx('hips'),1-w],[idx('paw-'+part),w]];},[[.28,.57],[.7,.57],[.5,.71],[.29,.82],[.71,.82],[.22,.94],[.78,.94]]);};
  for(const skin of rig.skins){if(view==='front'&&!['default','fox/front'].includes(skin.name)||view==='back'&&skin.name!=='fox/back')continue;const a=skin.attachments;if(view==='front')a.torso.torso=mesh('torso');else a['body-core']['body-core']=mesh('torso');for(const side of ['left','right'])a['leg-'+side]['leg-'+side]=mesh(side);}
 }
 const slot=rig.slots.splice(rig.slots.findIndex(s=>s.name==='body-core'),1)[0];rig.slots.splice(rig.slots.findIndex(s=>s.name==='arm-right'),0,slot);
}
