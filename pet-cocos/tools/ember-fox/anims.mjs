// Hand-authored animation for the Ember Fox. Each clip is a pose function of
// time, sampled into Spine timelines. Units: Spine units / degrees.
export const WALK={speed:.8,duration:.6,stance:.56,unit:3.8/640,stride:.48,lift:15};
const TAU=Math.PI*2,FPS=30;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),wrap=p=>((p%1)+1)%1;
const ease=t=>{t=clamp(t);return t*t*(3-2*t);},minJerk=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const S=(f,lag=0)=>Math.sin(TAU*(f-lag)),Cc=(f,lag=0)=>Math.cos(TAU*(f-lag));
// keyframe track with smooth (ease in/out) segments: [[t,v],...]
const K=(t,keys)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){const [t1,v1]=keys[i],[t0,v0]=keys[i-1];if(t<=t1)return v0+(v1-v0)*ease((t-t0)/(t1-t0||1));}return keys.at(-1)[1];};
// every body clip keys the same bones so mixes never leave stale channels behind
const BODY=['hips','back-btm','back-top','neck','head','ear-left','ear-right','tail','tail-mid','tail-mid2','tail-tip','scarf','scarf-mid','scarf-tip','scarf-back','scarf-back-mid','scarf-back-tip','arm-left','hand-left','arm-right','hand-right','weapon','ankle-left','ankle-right','leg-top-left','leg-top-right','slash'];
function sample(duration,pose,{loop=true,events=[],slots,drawOrder,fps=FPS}={}){
 const n=Math.max(2,Math.round(duration*fps)),bones={};
 const frames=Array.from({length:n+1},(_,i)=>{const t=i/n*duration;return {t:+t.toFixed(4),p:pose(loop&&i===n?0:t)};});
 for(const b of BODY){const r=[],tr=[],sc=[];for(const {t,p} of frames){const q=p[b]||{};r.push({time:t,value:+(q.r||0).toFixed(3)});tr.push({time:t,x:+(q.x||0).toFixed(3),y:+(q.y||0).toFixed(3)});sc.push({time:t,x:+(q.sx??1).toFixed(4),y:+(q.sy??1).toFixed(4)});}
  const flat=(a,k)=>a.every(v=>v[k]===a[0][k]);bones[b]={rotate:flat(r,'value')?[r[0]]:r,translate:flat(tr,'x')&&flat(tr,'y')?[tr[0]]:tr,scale:flat(sc,'x')&&flat(sc,'y')?[sc[0]]:sc};}
 const a={bones};if(events.length)a.events=events.map(([time,name])=>({time,name}));if(slots)a.slots=slots;if(drawOrder)a.drawOrder=drawOrder;
 // pad the clip to its duration even if the last key is earlier
 return a;}
const merge=(...ps)=>{const o={};for(const p of ps)for(const [b,v] of Object.entries(p)){const t=o[b]??={};for(const [k,x] of Object.entries(v))t[k]=k==='sx'||k==='sy'?(t[k]??1)*x:(t[k]||0)+x;}return o;};

// ----------------------------------------------------------------- locomotion
export function footPath(phase,travel,lift=WALK.lift){const p=wrap(phase),Sx=WALK.stance;let x,y=0,roll=0;
 if(p<Sx){const s=p/Sx;x=travel*(.5-s);if(s<.12)roll=8*(1-ease(s/.12));else if(s>.72){const k=ease((s-.72)/.28);roll=-14*k;y=3*k;}}
 else{const t=(p-Sx)/(1-Sx);x=travel*(-.5+minJerk(t));y=lift*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.08)),1.4)+3*(1-ease(t/.25));roll=t<.4?-14+6*ease(t/.4):t<.8?-8+16*ease((t-.4)/.4):8;}
 return {x,y,roll,stance:p<Sx};}
export const TRAVEL=WALK.speed*WALK.stance*WALK.duration/WALK.unit; // planted foot slides at ground speed
function walkPose(view){return t=>{const p=wrap(t/WALK.duration),q=wrap(p*2),bob=-Cc(q,.1),side=view==='side';
 const foot=sh=>{const f=footPath(p+sh,side?TRAVEL:TRAVEL*.34,side?WALK.lift:13);if(side)return {x:f.x,y:f.y,r:f.roll*.8};const dir=view==='away'?1:-1;return {x:0,y:f.y+dir*f.x,r:0};};
 const lean=side?-4-1.5*bob:0,hipR=(side?2:3.2)*S(p,.05);
 return {
  'ankle-left':foot(0),'ankle-right':foot(.5),
  hips:{x:(side?1.5:2.4)*S(p),y:5*bob,r:hipR},
  'back-btm':{sx:1-.03*bob,sy:1+.035*bob},'back-top':{r:lean},
  head:{r:-lean*.8-hipR*.7+1.2*S(p,.22)+1.2*Cc(q,.3),y:-1.2*bob-1*Cc(q,.25)},
  'ear-left':{r:6*Cc(q,.3)},'ear-right':{r:-5*Cc(q,.36)},
  tail:{r:(side?4:8)*S(p,.1)},'tail-mid':{r:(side?6:10)*S(p,.2)+2*Cc(q,.3)},'tail-mid2':{r:(side?8:10)*S(p,.3)+3*Cc(q,.38)},'tail-tip':{r:(side?10:12)*S(p,.42)},
  scarf:{r:-4+4*S(q,.15)},'scarf-mid':{r:6*S(q,.3)},'scarf-tip':{r:10*S(q,.45)},
  'scarf-back':{r:4*S(p,.15)},'scarf-back-mid':{r:6*S(p,.28)},'scarf-back-tip':{r:9*S(p,.4)},
  'arm-left':{r:-(side?16:9)*Cc(p)},'arm-right':{r:(side?5:4)*Cc(p)+.6*bob},weapon:{r:-2*Cc(p,.15)-1.5*Cc(q,.3)}
 };};}
// legs swap draw order in depth walks: the foot nearer the camera draws on top
function depthOrder(view){const D=WALK.duration,dir=view==='away'?1:-1,yl=p=>dir*footPath(p,TRAVEL*.34).x,yr=p=>dir*footPath(p+.5,TRAVEL*.34).x;const keys=[];let prev=null;
 for(let i=0;i<=240;i++){const p=i/240,leftFront=yl(p)<yr(p);if(leftFront!==prev){keys.push({time:+(p*D).toFixed(4),...(leftFront?{offsets:[{slot:'leg-left',offset:1}]}:{})});prev=leftFront;}}return keys;}

// ------------------------------------------------------------------ one-shots
const idle=t=>{const p=t/2.4,b=S(p);const twitch=K(t,[[0,0],[1.55,0],[1.62,-14],[1.7,2],[1.8,0]]);return {
 hips:{y:-1.2*Cc(p)},'back-btm':{sx:1-.012*b,sy:1+.02*b},'back-top':{r:-1+.8*S(p,.1)},head:{r:1.2*S(p,.18),y:.8*S(p,.15)},
 'ear-left':{r:2*S(p,.3)},'ear-right':{r:-2*S(p,.35)+twitch},
 tail:{r:3*S(p)},'tail-mid':{r:4*S(p,.1)},'tail-mid2':{r:5*S(p,.2)},'tail-tip':{r:7*S(p,.3)},
 scarf:{r:2*S(p,.1)},'scarf-mid':{r:3*S(p,.2)},'scarf-tip':{r:5*S(p,.3)},'scarf-back':{r:1.5*S(p)},'scarf-back-mid':{r:2.5*S(p,.15)},'scarf-back-tip':{r:3.5*S(p,.3)},
 'arm-left':{r:2*S(p,.12)},'arm-right':{r:1.5*S(p,.12)},weapon:{r:1.5*S(p,.25)}};};
const attack=t=>({
 hips:{x:K(t,[[0,0],[.2,-7],[.3,12],[.45,11],[.9,0]]),y:K(t,[[0,0],[.2,-7],[.3,-3],[.45,-4],[.9,0]])},
 'back-btm':{sx:K(t,[[0,1],[.2,1.05],[.28,.95],[.36,1.02],[.6,1]]),sy:K(t,[[0,1],[.2,.94],[.28,1.07],[.36,.98],[.6,1]])},
 'back-top':{r:K(t,[[0,0],[.2,9],[.3,-12],[.45,-10],[.9,0]])},head:{r:K(t,[[0,0],[.2,-5],[.3,10],[.45,8],[.9,0]])},
 'ear-left':{r:K(t,[[0,0],[.2,10],[.3,-12],[.5,3],[.7,0]])},'ear-right':{r:K(t,[[0,0],[.2,8],[.3,-14],[.5,3],[.7,0]])},
 'arm-right':{r:K(t,[[0,0],[.2,-62],[.25,-20],[.3,78],[.45,74],[.65,20],[.9,0]])},weapon:{r:K(t,[[0,0],[.2,-55],[.26,-62],[.31,-58],[.45,-62],[.7,-14],[.9,0]])},
 'arm-left':{r:K(t,[[0,0],[.2,-28],[.3,34],[.45,28],[.9,0]])},
 'ankle-right':{x:K(t,[[0,0],[.22,0],[.3,16],[.7,16],[.86,0]]),y:K(t,[[0,0],[.22,0],[.26,9],[.3,0],[.7,0],[.78,7],[.86,0]])},
 'ankle-left':{x:K(t,[[0,0],[.3,0],[.36,-4],[.9,0]])},
 tail:{r:K(t,[[0,0],[.2,10],[.32,-12],[.6,4],[.9,0]])},'tail-mid':{r:K(t,[[0,0],[.22,10],[.34,-14],[.62,5],[.9,0]])},'tail-mid2':{r:K(t,[[0,0],[.24,10],[.36,-14],[.64,5],[.9,0]])},'tail-tip':{r:K(t,[[0,0],[.26,12],[.38,-16],[.66,6],[.9,0]])},
 scarf:{r:K(t,[[0,0],[.2,6],[.32,-14],[.6,2],[.9,0]])},'scarf-mid':{r:K(t,[[0,0],[.22,6],[.34,-16],[.62,4],[.9,0]])},'scarf-tip':{r:K(t,[[0,0],[.24,8],[.36,-20],[.64,6],[.9,0]])},
 slash:{r:K(t,[[0,-25],[.25,-25],[.34,15]]),sx:K(t,[[0,.85],[.25,.85],[.31,1.1],[.42,1.18]]),sy:K(t,[[0,.85],[.25,.85],[.31,1.1],[.42,1.18]])}});
const hit=t=>({hips:{x:K(t,[[0,0],[.06,-10],[.2,-4],[.42,0]])},'back-btm':{sx:K(t,[[0,1],[.06,1.08],[.16,.96],[.3,1]]),sy:K(t,[[0,1],[.06,.92],[.16,1.04],[.3,1]])},
 'back-top':{r:K(t,[[0,0],[.06,14],[.2,5],[.42,0]])},head:{r:K(t,[[0,0],[.06,10],[.25,2],[.42,0]])},'ear-left':{r:K(t,[[0,0],[.06,22],[.3,4],[.42,0]])},'ear-right':{r:K(t,[[0,0],[.06,24],[.3,4],[.42,0]])},
 'arm-left':{r:K(t,[[0,0],[.06,-34],[.3,-6],[.42,0]])},'arm-right':{r:K(t,[[0,0],[.06,26],[.3,4],[.42,0]])},tail:{r:K(t,[[0,0],[.08,-14],[.25,6],[.42,0]])},'tail-tip':{r:K(t,[[0,0],[.1,-18],[.28,8],[.42,0]])},scarf:{r:K(t,[[0,0],[.08,12],[.3,-4],[.42,0]])}});
const hop=(t,a,b)=>{const u=(t-a)/(b-a);if(u<0||u>1)return {h:0,sq:0};const pre=.22,air=u<pre?0:u>.85?0:Math.sin(Math.PI*(u-pre)/(.85-pre));const sq=u<pre?Math.sin(Math.PI*u/pre):u>.85?Math.sin(Math.PI*(u-.85)/.15):0;return {h:air,sq};};
const happy=t=>{const h1=hop(t,.05,.5),h2=hop(t,.6,1.05),h=h1.h+h2.h,sq=h1.sq+h2.sq,arms=K(t,[[0,0],[.15,1],[1.0,1],[1.2,0]]),wag=S(t*3.2);return {
 hips:{y:30*h-7*sq},'ankle-left':{y:22*h},'ankle-right':{y:22*h},'back-btm':{sx:1+.06*sq-.03*h,sy:1-.07*sq+.05*h},head:{r:4*S(t*1.6),y:-3*h},
 'arm-left':{r:-125*arms+10*wag},'arm-right':{r:45*arms-6*wag},weapon:{r:-15*arms},'ear-left':{r:-6*h+4*sq},'ear-right':{r:6*h-4*sq},
 tail:{r:10*wag},'tail-mid':{r:12*S(t*3.2,.1)},'tail-mid2':{r:14*S(t*3.2,.2)},'tail-tip':{r:16*S(t*3.2,.3)},scarf:{r:-10*h},'scarf-tip':{r:-14*h}};};
const sniff=t=>{const lean=K(t,[[0,0],[.25,1],[.9,1],[1.15,0]]),tw=t>.3&&t<.9?S(t*7):0;return {'back-top':{r:-10*lean},head:{r:-8*lean+2.5*tw,x:6*lean,y:-8*lean},hips:{y:-3*lean},
 'ear-left':{r:-8*lean},'ear-right':{r:-10*lean},tail:{r:6*S(t*1.7)},'tail-mid2':{r:8*S(t*1.7,.2)},'tail-tip':{r:10*S(t*1.7,.3)},'arm-left':{r:10*lean},'arm-right':{r:6*lean}};};
const sleepPose={hips:{y:-26},'back-btm':{sx:1.06,sy:.94},'back-top':{r:-6},head:{r:-12,y:-4},'ear-left':{r:16},'ear-right':{r:-16},tail:{r:22},'tail-mid':{r:14},'tail-mid2':{r:16},'tail-tip':{r:10},'arm-left':{r:14},'arm-right':{r:-6},weapon:{r:-75},scarf:{r:6},'scarf-tip':{r:8}};
const sleep=t=>{const p=t/3,b=S(p);return merge(sleepPose,{'back-btm':{sy:1+.03*b,sx:1-.015*b},head:{r:1.5*S(p,.1)},'tail-tip':{r:3*S(p,.2)}});};
const scale=(pose,k)=>Object.fromEntries(Object.entries(pose).map(([b,v])=>[b,Object.fromEntries(Object.entries(v).map(([c,x])=>[c,c==='sx'||c==='sy'?1+(x-1)*k:x*k]))]));
const wake=t=>{const out=1-ease(t/.18),st=K(t,[[0,0],[.12,0],[.25,1],[.45,0]]);return merge(scale(sleepPose,out),{'arm-left':{r:-120*st},'arm-right':{r:110*st},'back-btm':{sy:1+.08*st,sx:1-.04*st},head:{r:6*st}});};
const start=t=>({'back-top':{r:K(t,[[0,0],[.08,4],[.2,-4]])},'back-btm':{sy:K(t,[[0,1],[.08,.95],[.2,1]]),sx:K(t,[[0,1],[.08,1.04],[.2,1]])}});
const stop=t=>({'back-top':{r:K(t,[[0,-4],[.1,-8],[.25,0]])},head:{r:K(t,[[0,0],[.12,4],[.25,0]])},hips:{y:K(t,[[0,0],[.1,-4],[.25,0]])},'back-btm':{sy:K(t,[[0,1],[.1,.95],[.25,1]]),sx:K(t,[[0,1],[.1,1.04],[.25,1]])},tail:{r:K(t,[[0,0],[.12,-8],[.25,0]])},scarf:{r:K(t,[[0,-4],[.12,-12],[.25,0]])}});
// ------------------------------------------------------------------ face/look
const FACES={calm:['eyes-open','brows-calm','mouth-smile',true],focus:['eyes-focus','brows-determined','mouth-flat',true],happy:['eyes-happy','brows-calm','mouth-open',false],alert:['eyes-alert','brows-worried','mouth-o',true],sleep:['eyes-sleep',null,'mouth-flat',false]};
function face([eyes,brows,mouth,blink]){const ek=[{time:0,name:eyes}];if(blink)ek.push({time:2.4,name:'eyes-blink'},{time:2.52,name:eyes});return {slots:{eyes:{attachment:ek},brows:{attachment:[{time:0,name:brows}]},mouth:{attachment:[{time:0,name:mouth}]}},bones:{},events:undefined,_d:3.2};}
export function buildAnimations(){const A={};const D=WALK.duration;
 const steps=[[0,'step-left'],[+(D/2).toFixed(4),'step-right']];
 A.walk=sample(D,walkPose('side'),{events:steps,fps:60});A['walk-preview']=structuredClone(A.walk);
 A['walk-back']=sample(D,walkPose('away'),{events:steps,fps:60,drawOrder:depthOrder('away')});A['walk-back-preview']=structuredClone(A['walk-back']);
 A['walk-front']=sample(D,walkPose('toward'),{events:steps,fps:60,drawOrder:depthOrder('toward')});
 A.idle=sample(2.4,idle);A.attack=sample(.9,attack,{loop:false,events:[[.29,'strike']],fps:60,
  slots:{slash:{attachment:[{time:0,name:null},{time:.25,name:'slash'},{time:.44,name:null}],rgba:[{time:0,color:'ffffffff'},{time:.33,color:'ffffffff'},{time:.44,color:'ffffff00'}]}}});
 A.hit=sample(.42,hit,{loop:false,fps:60});A.happy=sample(1.2,happy,{loop:false,fps:60});A.sniff=sample(1.15,sniff,{loop:false});
 A.sleep=sample(3,sleep);A.wake=sample(.45,wake,{loop:false,fps:60});A.start=sample(.2,start,{loop:false});A.turn=sample(.2,start,{loop:false});A.stop=sample(.25,stop,{loop:false});
 for(const [k,v] of Object.entries(FACES)){const f=face(v);A['face-'+k]={slots:f.slots};}
 // a silent key at 3.2s keeps every face clip the same length so blinks loop cleanly
 for(const k of Object.keys(FACES))A['face-'+k].slots.mouth.attachment.push({time:3.2,name:A['face-'+k].slots.mouth.attachment[0].name});
 for(const [k,x] of [['left',-10],['right',8],['center',0]])A['look-'+k]={bones:{gaze:{translate:[{time:0,x,y:0}]}}};
 return A;}
