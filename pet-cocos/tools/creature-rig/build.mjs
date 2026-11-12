// Rigs a creature parts sheet (gen.mjs) on its body type's skeleton with code-made animations. Animation names, the
// strike event (0.29s) and the skin names match the Ember Fox rigs, so BattleSlice / CampLife play these unchanged.
// usage (from pet-cocos): node tools/creature-rig/build.mjs <kind>   -> assets/resources/pets/rig/<kind>/
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
import {GRIDS,CREATURES} from './gen.mjs';
const kind=process.argv[2],C=CREATURES[kind],G=GRIDS[C.type],OUT=`assets/resources/pets/rig/${kind}`,FPS=30,RES=.5;
const r2=v=>Math.round(v*100)/100;

// ---- cut every cell: flood the white background from the border, keep the part, trim
async function cut(buf,info,[cx,cy,cw,ch]){const sx=info.width/1536,sy=info.height/1024,ins=10,left=Math.round((cx+ins)*sx),top=Math.round((cy+ins)*sy),W=Math.round((cw-2*ins)*sx),H=Math.round((ch-2*ins)*sy);
 const {data}=await sharp(buf).extract({left,top,width:W,height:H}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const white=i=>Math.min(data[i],data[i+1],data[i+2]),bg=new Uint8Array(W*H),st=[];for(let x=0;x<W;x++)st.push(x,0,x,H-1);for(let y=0;y<H;y++)st.push(0,y,W-1,y);
 while(st.length){const y=st.pop(),x=st.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(bg[k])continue;if(white(k*4)<215)continue;bg[k]=1;st.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 const lab=new Int32Array(W*H).fill(-1),sizes=[];for(let s0=0;s0<W*H;s0++){if(bg[s0]||lab[s0]>=0)continue;const id=sizes.length;let c=0;const q=[s0];lab[s0]=id;while(q.length){const k=q.pop();c++;const x=k%W,y=(k/W)|0;for(const nb of [x>0?k-1:-1,x<W-1?k+1:-1,y>0?k-W:-1,y<H-1?k+W:-1])if(nb>=0&&!bg[nb]&&lab[nb]<0){lab[nb]=id;q.push(nb);}}sizes.push(c);}
 const big=Math.max(0,...sizes);for(let k=0;k<W*H;k++)if(!bg[k]&&sizes[lab[k]]<big*.03)bg[k]=1;
 let n=0;for(let k=0;k<W*H;k++){const i=k*4;if(bg[k]){data[i+3]=0;continue;}n++;const x=k%W,y=(k/W)|0,rim=(x>0&&bg[k-1])||(x<W-1&&bg[k+1])||(y>0&&bg[k-W])||(y<H-1&&bg[k+W]),w=white(i);data[i+3]=rim&&w>200?Math.round(255*(255-w)/55):255;}
 if(n<300)return null;const {data:d,info:o}=await sharp(data,{raw:{width:W,height:H,channels:4}}).trim({threshold:1}).raw().toBuffer({resolveWithObject:true});return {raw:d,w:o.width/sx,h:o.height/sy,pw:o.width,ph:o.height};}

// ---- layouts (units: skeleton units, y up, ground at 0). mount = where on the body (fractions of body w/h from its
// centre) the part's bone sits; anchor = which point of the part image is on that bone (0..1, y down)
const LAYOUT={
 quad:{bodyW:330,size:{},z:['leg-ff','leg-bf','tail','body','leg-bn','leg-fn','head'],
  parts:{'leg-fn':{mount:[.27,-.3],anchor:[.5,.12]},'leg-ff':{mount:[.12,-.24],anchor:[.5,.12]},'leg-bn':{mount:[-.25,-.3],anchor:[.5,.12]},'leg-bf':{mount:[-.38,-.24],anchor:[.5,.12]},
   head:{mount:[.42,-.06],anchor:[.25,.66]},tail:{mount:[-.5,-.22],anchor:[.85,.5]}}},
 blob:{bodyW:230,z:['limb-far','base','body','limb-near','head','item'],
  parts:{'limb-far':{mount:[-.36,.12],anchor:[.8,.2]},'limb-near':{mount:[.36,.08],anchor:[.2,.2]},head:{mount:[.02,.3],anchor:[.5,.78]},base:{mount:[0,-.4],anchor:[.5,.3]},item:{mount:[.55,0],anchor:[.25,.75]}}},
 flyer:{bodyW:250,hover:120,z:['wing-far','feet','body','wing-near','head','item'],
  parts:{'wing-far':{mount:[-.2,.22],anchor:[.97,.78]},'wing-near':{mount:[.18,.2],anchor:[.03,.78]},head:{mount:[.04,.42],anchor:[.5,.86]},feet:{mount:[0,-.42],anchor:[.5,.1]},item:{mount:[.5,-.05],anchor:[.25,.7]}}},
};
const L=LAYOUT[C.type];
// per-pet mount overrides (fractions of the body size): the octopus' body is tiny, so its wand needs to sit further out
// bat and seal are painted head+body as ONE piece (no seam at the neck); their limbs mount on that whole-body piece,
// with each root tucked behind the body
const MOUNT={octopus:{item:[1.5,-.2]},
 bat:{'wing-near':[.22,-.12],'wing-far':[-.22,-.12],feet:[0,-.46],item:[.42,-.22]},
 seal:{'limb-near':[.42,-.2],'limb-far':[-.42,-.2],base:[0,-.36],item:[.52,-.08]}};
// parts painted pointing the wrong way are mirrored (seal flippers were drawn pointing inward)
const FLIP={seal:{'limb-near':true,'limb-far':true}};
const ANCHOR={bat:{'wing-near':[.07,.42],'wing-far':[.93,.42],feet:[.5,.2]},seal:{'limb-near':[.3,.1],'limb-far':[.7,.1],base:[.5,.42]}};
const sheet=fs.readFileSync(`art-gen/creature/${kind}.png`),info=await sharp(sheet).metadata(),parts={};
for(const [n,cell] of Object.entries(G.cells)){const c=await cut(sheet,info,cell);if(c)parts[n]=c;}
const k=L.bodyW/parts.body.w; // one scale for every part: Codex drew them at the same scale
// per-pet proportion fixes, matched against the portrait at camp size (Codex does not keep its parts to one scale)
const SIZE={turtle:{body:1.12,head:1.05,tail:.75,'leg-fn':.72,'leg-ff':.72,'leg-bn':.72,'leg-bf':.72},bat:{'wing-near':.6,'wing-far':.6},seal:{base:.82,'limb-near':.55,'limb-far':.55},octopus:{body:[.62,.5],head:1.35,base:1.3,'limb-near':.85,'limb-far':.85}}[kind]||{};
for(const [n,p] of Object.entries(parts)){const m=SIZE[n]??1,[mx,my]=Array.isArray(m)?m:[m,m];p.W=p.w*k*mx;p.H=p.h*k*my;}
const B=parts.body;
// quad: the legs (mounted 0.3 body-heights below its centre, image top 12% tucked in) reach the ground; flyer: hovers
const bodyCY=C.type==='quad'?parts['leg-fn'].H*.88+.3*B.H:C.type==='blob'?(parts.base?parts.base.H*.7+.4*B.H:B.H/2)+(C.float||0):L.hover+B.H/2;

// ---- skeleton
const bones=[{name:'root'},{name:'body',parent:'root',x:0,y:r2(bodyCY)}];
const slots=[],att={};
for(const n of L.z){const p=parts[n];if(!p)continue;let bone='body';
 if(n!=='body'){const [mx,my]=MOUNT[kind]?.[n]||L.parts[n].mount;bones.push({name:n,parent:'body',x:r2(mx*B.W),y:r2(my*B.H)});bone=n;}
 const [ax0,ay]=n==='body'?[.5,.5]:ANCHOR[kind]?.[n]||L.parts[n].anchor,flip=!!FLIP[kind]?.[n],ax=flip?1-ax0:ax0;
 slots.push({name:n,bone,attachment:n});att[n]={[n]:{x:r2((.5-ax)*p.W),y:r2((ay-.5)*p.H),...(flip?{scaleX:-1}:{}),width:r2(p.W),height:r2(p.H)}};}

// ---- animations: pose functions sampled to Spine timelines
const TAU=Math.PI*2,ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,lerp=(a,b,t)=>a+(b-a)*t;
const track=(keys,t)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [t0,v0]=keys[i-1],[t1,v1]=keys[i];return lerp(v0,v1,ease((t-t0)/(t1-t0)));}return keys[keys.length-1][1];};
function anim(dur,fn,events){const n=Math.max(2,Math.round(dur*FPS)),keys=[];for(let i=0;i<=n;i++){const t=i/n*dur;keys.push({t:Math.round(t*1e4)/1e4,pose:fn(t,t/dur)});}
 const out={bones:{}};for(const b of bones.map(b=>b.name)){const tl={},get=k=>k.pose[b]||{};
  if(keys.some(k=>get(k).r))tl.rotate=keys.map(k=>({time:k.t,value:r2(get(k).r||0)}));
  if(keys.some(k=>get(k).x||get(k).y))tl.translate=keys.map(k=>({time:k.t,x:r2(get(k).x||0),y:r2(get(k).y||0)}));
  if(keys.some(k=>get(k).sx!==undefined||get(k).sy!==undefined))tl.scale=keys.map(k=>({time:k.t,x:+(get(k).sx??1).toFixed(3),y:+(get(k).sy??1).toFixed(3)}));
  if(Object.keys(tl).length)out.bones[b]=tl;}
 if(events)out.events=events;return out;}
const A={};const W=B.W,H=B.H;
if(C.type==='quad'){
 // four legs step in diagonal pairs; the shell rocks a little; the head leads every move
 const legs=(s,a)=>({'leg-fn':{r:a*s},'leg-bf':{r:a*s},'leg-ff':{r:-a*s},'leg-bn':{r:-a*s}});
 A.idle=anim(2,(t,p)=>{const s=Math.sin(p*TAU);return {body:{sy:1+.015*s,sx:1-.008*s},head:{r:3*Math.sin(p*TAU-.8),y:2*s},tail:{r:8*Math.sin(p*TAU*2)}};});
 A.walk=anim(.6,(t,p)=>{const s=Math.sin(p*TAU),b=Math.abs(Math.sin(p*TAU));return {...legs(s,20),body:{y:4*b,r:1.5*s},head:{r:-2.5*s,y:2*b},tail:{r:12*s}};},[{time:0,name:'step-left'},{time:.3,name:'step-right'}]);
 // attack: pull the head in, then a headbutt with the whole shell behind it (strike at 0.29)
 A.attack=anim(.6,t=>{const hx=track([[0,0],[.18,-.14*W],[.29,.09*W],[.42,.05*W],[.6,0]],t),bx=track([[0,0],[.18,-8],[.29,22],[.42,12],[.6,0]],t),br=track([[0,0],[.18,5],[.29,-6],[.6,0]],t);
  return {root:{x:bx},body:{r:br},head:{x:hx,r:track([[0,0],[.18,8],[.29,-10],[.6,0]],t)},...legs(track([[0,0],[.18,1],[.29,-1],[.6,0]],t),14)};},[{time:.29,name:'strike'}]);
 A.hit=anim(.35,t=>({root:{x:track([[0,0],[.08,-12],[.35,0]],t)},body:{r:track([[0,0],[.08,7],[.35,0]],t)},head:{x:track([[0,0],[.1,-.1*W],[.35,0]],t),r:track([[0,0],[.1,12],[.35,0]],t)}}));
 A.happy=anim(.9,t=>{const j=Math.max(0,Math.sin(t/.45*Math.PI));return {root:{y:j*34},body:{r:4*Math.sin(t/.9*TAU)},head:{r:-8*Math.sin(t/.9*TAU)},...legs(j,-12)};});
 A.sniff=anim(1.4,t=>({head:{r:track([[0,0],[.35,-14],[.5,-9],[.65,-15],[.8,-9],[1.05,-14],[1.4,0]],t),x:track([[0,0],[.35,.05*W],[1.05,.05*W],[1.4,0]],t)}}));
 // sleep: the head pulls back under the shell, legs tuck in
 const tuck={head:{x:-.2*W,y:-.06*H,sx:.9,sy:.9},'leg-fn':{y:10},'leg-ff':{y:10},'leg-bn':{y:10},'leg-bf':{y:10},body:{y:-14}};
 A.sleep=anim(2.4,t=>{const s=Math.sin(t/2.4*TAU);return {...tuck,body:{y:-14,sy:1+.015*s}};});
 A.wake=anim(.8,t=>{const k=track([[0,1],[.6,0],[.8,0]],t);const o={};for(const [b,v] of Object.entries(tuck)){o[b]={};for(const [f,x] of Object.entries(v))o[b][f]=f[0]==='s'?lerp(1,x,k):x*k;}return o;});
}else if(C.type==='blob'){
 // blob: a round body that waddles/bobs; flippers or tentacles paddle; the base (tail flippers / lower tentacles) wiggles
 const fl=C.float||0,paddle=(p,a)=>({'limb-near':{r:-a*Math.sin(p*TAU)},'limb-far':{r:a*Math.sin(p*TAU+.6)},base:{sx:1+.05*Math.sin(p*TAU*2),r:3*Math.sin(p*TAU)}});
 A.idle=anim(1.6,(t,p)=>{const s=Math.sin(p*TAU);return {...paddle(p,8),root:{y:fl?6*s:0},body:{sy:1+.025*s,sx:1-.015*s},head:{r:3*Math.sin(p*TAU-.7)}};});
 A.walk=anim(.6,(t,p)=>{const q=(p*2)%1,lift=Math.sin(Math.PI*q),land=Math.pow(1-lift,6);return {...paddle(p,22),root:{y:lift*(fl?10:16)},body:{sy:1+.06*lift-.08*land,sx:1-.03*lift+.06*land,r:5*Math.sin(p*TAU)},head:{r:-3*Math.sin(p*TAU)}};},[{time:0,name:'step-left'},{time:.3,name:'step-right'}]);
 A.attack=anim(.6,t=>({root:{x:track([[0,0],[.18,-10],[.29,30],[.42,18],[.6,0]],t),y:track([[0,0],[.18,8],[.29,0],[.6,0]],t)},body:{r:track([[0,0],[.18,8],[.29,-10],[.6,0]],t),sy:track([[0,1],[.18,.92],[.29,1.06],[.6,1]],t)},
  'limb-near':{r:track([[0,0],[.18,40],[.29,-60],[.42,-40],[.6,0]],t)},'limb-far':{r:track([[0,0],[.18,-20],[.29,30],[.6,0]],t)},head:{r:track([[0,0],[.18,6],[.29,-8],[.6,0]],t)}}),[{time:.29,name:'strike'}]);
 A.hit=anim(.35,t=>({root:{x:track([[0,0],[.08,-12],[.35,0]],t)},body:{r:track([[0,0],[.08,9],[.35,0]],t),sx:track([[0,1],[.08,1.08],[.35,1]],t),sy:track([[0,1],[.08,.9],[.35,1]],t)},head:{r:track([[0,0],[.1,10],[.35,0]],t)}}));
 A.happy=anim(.9,t=>{const j=Math.max(0,Math.sin(t/.45*Math.PI));return {...paddle(t/.45,30),root:{y:j*34},body:{r:4*Math.sin(t/.9*TAU)},head:{r:-6*Math.sin(t/.9*TAU)}};});
 A.sniff=anim(1.4,t=>({...paddle(t/1.4,6),head:{r:track([[0,0],[.35,-12],[.5,-7],[.65,-13],[.8,-7],[1.05,-12],[1.4,0]],t)}}));
 const curl={body:{sy:.9,sx:1.06},head:{r:12,y:-.08*H},'limb-near':{r:30},'limb-far':{r:-30},root:{y:-fl}};
 A.sleep=anim(2.4,t=>{const s=Math.sin(t/2.4*TAU);return {...curl,body:{sy:.9+.02*s,sx:1.06}};});
 A.wake=anim(.8,t=>{const k=track([[0,1],[.6,0],[.8,0]],t);return {body:{sy:lerp(1,.9,k),sx:lerp(1,1.06,k)},head:{r:12*k,y:-.08*H*k},'limb-near':{r:30*k},'limb-far':{r:-30*k},root:{y:-fl*k}};});
}else{
 // flyer: hovers and flaps all the time; the body hangs from the wings with a little lag
 const flap=(p,amp,lag=.12)=>{const s=Math.sin(p*TAU);return {'wing-near':{r:-amp*s},'wing-far':{r:amp*s},body:{y:-.06*H*Math.sin(p*TAU-lag*TAU)},head:{r:2*Math.sin(p*TAU-.5)},feet:{r:10*Math.sin(p*TAU-1.2)}};};
 A.idle=anim(.5,(t,p)=>({...flap(p,18),root:{y:6*Math.sin(p*TAU)}}));
 A.walk=anim(.6,(t,p)=>{const f=flap((p*2)%1,22);return {...f,root:{y:6*Math.sin(p*TAU*2)},body:{...f.body,r:-8}};},[{time:0,name:'step-left'},{time:.3,name:'step-right'}]);
 // attack: rise and pull back, then swoop forward with wings swept (strike at 0.29)
 A.attack=anim(.6,t=>{const p=(t/.6*3)%1,f=flap(p,34);return {...f,root:{x:track([[0,0],[.18,-14],[.29,46],[.42,30],[.6,0]],t),y:track([[0,0],[.18,22],[.29,-6],[.6,0]],t)},
  body:{...f.body,r:track([[0,0],[.18,10],[.29,-22],[.45,-10],[.6,0]],t)},'wing-near':{r:track([[0,0],[.18,-30],[.29,40],[.6,0]],t)},'wing-far':{r:track([[0,0],[.18,30],[.29,-40],[.6,0]],t)}};},[{time:.29,name:'strike'}]);
 A.hit=anim(.35,t=>({...flap(t/.35,18),root:{x:track([[0,0],[.08,-16],[.35,0]],t),y:track([[0,0],[.08,10],[.35,0]],t)},body:{r:track([[0,0],[.08,14],[.35,0]],t)}}));
 A.happy=anim(.9,t=>({...flap((t/.3)%1,36),root:{y:Math.max(0,Math.sin(t/.45*Math.PI))*30},body:{r:track([[0,0],[.45,-12],[.9,0]],t)}}));
 A.sniff=anim(1.4,(t)=>({...flap((t/.5)%1,20),head:{r:track([[0,0],[.35,-12],[.7,6],[1.05,-10],[1.4,0]],t)}}));
 // sleep: lands low, wings fold down around the body
 const fold={'wing-near':{r:-55},'wing-far':{r:55},root:{y:-L.hover+18},head:{r:-10,y:-4}};
 A.sleep=anim(2.4,t=>{const s=Math.sin(t/2.4*TAU);return {...fold,body:{sy:1+.02*s}};});
 A.wake=anim(.8,t=>{const k=track([[0,1],[.6,0],[.8,0]],t),f=flap((t/.4)%1,26*(1-k));return {...f,'wing-near':{r:lerp(f['wing-near'].r,-55,k)},'wing-far':{r:lerp(f['wing-far'].r,55,k)},root:{y:(-L.hover+18)*k}};});
}
A.start=anim(.2,t=>C.type==='quad'?{body:{sy:track([[0,1],[.1,.95],[.2,1]],t)}}:{root:{y:track([[0,0],[.1,8],[.2,0]],t)}});
A.stop=anim(.25,t=>({body:{r:track([[0,0],[.1,-4],[.25,0]],t)}}));
A.turn=anim(.2,t=>({body:{sx:track([[0,1],[.1,.85],[.2,1]],t)}}));
for(const n of ['walk-back','walk-front'])A[n]=A.walk;
// expressions and gaze are painted in; keep the track names the game sets
for(const n of ['face-calm','face-focus','face-happy','face-alert','face-sleep','look-left','look-right','look-center'])A[n]={};

// ---- atlas (half-resolution, palette PNG, power of two), json, metas
// one atlas pixel per skeleton unit (2x RES), same density as the layered rigs
const imgs=[];for(const [n,p] of Object.entries(parts)){const w=Math.max(1,Math.round(p.W*2*RES)),h=Math.max(1,Math.round(p.H*2*RES));
 imgs.push({n,w,h,buf:await sharp(p.raw,{raw:{width:p.pw,height:p.ph,channels:4}}).resize(w,h,{fit:'fill'}).png().toBuffer()});}
imgs.sort((a,b)=>b.h-a.h);let PW=512,x,y,row;const pack=()=>{x=4;y=4;row=0;for(const i of imgs){if(x+i.w+4>PW){x=4;y+=row+4;row=0;}i.x=x;i.y=y;x+=i.w+4;row=Math.max(row,i.h);}return y+row+4;};
let used=pack();if(used>PW){PW=1024;used=pack();}let PH=1;while(PH<used)PH*=2;
fs.mkdirSync(OUT,{recursive:true});
await sharp({create:{width:PW,height:PH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(imgs.map(i=>({input:i.buf,left:i.x,top:i.y}))).png({compressionLevel:9,palette:true,quality:92,dither:.6,effort:10}).toFile(path.join(OUT,kind+'.png'));
fs.writeFileSync(path.join(OUT,kind+'.atlas'),`${kind}.png\nsize: ${PW}, ${PH}\nformat: RGBA8888\nfilter: Linear, Linear\nrepeat: none\npma: false\n`+imgs.map(i=>`${i.n}\nbounds: ${i.x}, ${i.y}, ${i.w}, ${i.h}\n`).join(''));
const skins=[{name:'default',attachments:{}},{name:'fox/front',attachments:att},...['gear/scarf-front','gear/sword-front','fox/back','gear/scarf-back','gear/sword-back'].map(n=>({name:n,attachments:n==='fox/back'?att:{}}))];
fs.writeFileSync(path.join(OUT,kind+'.json'),JSON.stringify({skeleton:{hash:`creature-${kind}-v1`,spine:'4.2.73',x:-260,y:-10,width:520,height:420,images:'./images/'},bones,slots,skins,events:{'step-left':{},'step-right':{},strike:{}},animations:A}));
const meta=(f,o)=>{if(!fs.existsSync(f))fs.writeFileSync(f,JSON.stringify(o,null,2));return JSON.parse(fs.readFileSync(f,'utf8')).uuid;};
meta(OUT+'.meta',{ver:'1.2.0',importer:'directory',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
meta(path.join(OUT,kind+'.png.meta'),{ver:'1.0.27',importer:'image',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{type:'texture',hasAlpha:true}});
const atlas=meta(path.join(OUT,kind+'.atlas.meta'),{ver:'1.0.0',importer:'*',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{}});
meta(path.join(OUT,kind+'.json.meta'),{ver:'1.2.7',importer:'spine-data',imported:false,uuid:crypto.randomUUID(),files:[],subMetas:{},userData:{atlasUuid:atlas}});
console.log(JSON.stringify({kind,type:C.type,parts:Object.keys(parts),page:[PW,PH]}));
