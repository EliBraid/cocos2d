const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const K=(t,keys)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){const [t1,v1]=keys[i],[t0,v0]=keys[i-1];if(t<=t1)return v0+(v1-v0)*ease((t-t0)/(t1-t0||1));}return keys.at(-1)[1];};
const BONES=['body','top','face','foot-left','foot-right'];
function sample(D,pose,{loop=true,fps=30,events,slots}={}){const n=Math.max(2,Math.round(D*fps)),bones={};const fr=Array.from({length:n+1},(_,i)=>{const t=i/n*D;return {t:+t.toFixed(4),p:pose(loop&&i===n?0:t)};});
 for(const b of BONES){const r=[],tr=[],sc=[];for(const {t,p} of fr){const q=p[b]||{};r.push({time:t,value:+(q.r||0).toFixed(3)});tr.push({time:t,x:+(q.x||0).toFixed(3),y:+(q.y||0).toFixed(3)});sc.push({time:t,x:+(q.sx??1).toFixed(4),y:+(q.sy??1).toFixed(4)});}bones[b]={rotate:r,translate:tr,scale:sc};}
 const a={bones};if(events)a.events=events.map(([time,name])=>({time,name}));if(slots)a.slots=slots;return a;}
const ALL=['foot-left','foot-right','body','top','face'];
const face=(name)=>({face:{attachment:[{time:0,name}]}});
export function buildAnimations(){const A={};
 A.idle=sample(1,t=>{const b=Math.sin(TAU*t);return {body:{sx:1+.03*b,sy:1-.03*b},top:{r:3*Math.sin(TAU*(t-.15))},face:{y:-1.5*b}};},{slots:face('face-angry')});
 // hop-walk: squash on landing, stretch in the air, feet tuck
 A.walk=sample(.5,t=>{const p=t/.5,air=Math.max(0,Math.sin(TAU*p)),land=Math.max(0,-Math.sin(TAU*p));return {body:{y:16*air,sx:1+.08*land-.04*air,sy:1-.1*land+.06*air,r:4*Math.sin(TAU*p*.5)},top:{r:-6*Math.sin(TAU*(p-.12))},face:{y:-2*air},
  'foot-left':{y:9*air,x:-3*air},'foot-right':{y:9*air,x:3*air}};},{slots:face('face-angry')});
 A.attack=sample(.6,t=>({body:{x:K(t,[[0,0],[.22,-10],[.3,18],[.6,0]]),r:K(t,[[0,0],[.22,10],[.3,-16],[.6,0]]),sx:K(t,[[0,1],[.22,1.12],[.3,.9],[.45,1]]),sy:K(t,[[0,1],[.22,.88],[.3,1.12],[.45,1]])},top:{r:K(t,[[0,0],[.24,8],[.34,-14],[.6,0]])},face:{x:K(t,[[0,0],[.3,4],[.6,0]])}}),{loop:false,events:[[.25,'bite']],slots:face('face-angry')});
 A.hit=sample(.25,t=>({body:{x:K(t,[[0,0],[.05,-8],[.25,0]]),sx:K(t,[[0,1],[.05,1.15],[.15,.95],[.25,1]]),sy:K(t,[[0,1],[.05,.85],[.15,1.05],[.25,1]])},top:{r:K(t,[[0,0],[.06,12],[.25,0]])}}),{loop:false,slots:{face:{attachment:[{time:0,name:'face-hurt'},{time:.2,name:'face-angry'}]},body:{rgba:[{time:0,color:'ff8a80ff'},{time:.12,color:'ffffffff'}]}}});
 const fade=[{time:0,color:'ffffffff'},{time:.3,color:'ffffffff'},{time:.6,color:'ffffff00'}];
 A.die=sample(.6,t=>({body:{sx:K(t,[[0,1],[.1,1.25],[.5,1.6]]),sy:K(t,[[0,1],[.1,.7],[.5,.2]]),y:K(t,[[0,0],[.1,6],[.5,-4]])},top:{y:K(t,[[0,0],[.15,30],[.5,10]]),r:K(t,[[0,0],[.5,40]])}}),{loop:false,slots:Object.fromEntries([['face',{attachment:[{time:0,name:'face-hurt'}],rgba:fade}],...['body','top','foot-left','foot-right'].map(s=>[s,{rgba:fade}])])});
 A.spawn=sample(.45,t=>({body:{y:K(t,[[0,40],[.25,0]]),sx:K(t,[[0,.2],[.25,1.2],[.35,.95],[.45,1]]),sy:K(t,[[0,.2],[.25,.85],[.35,1.08],[.45,1]])},'foot-left':{sx:K(t,[[0,0],[.25,1]]),sy:K(t,[[0,0],[.25,1]])},'foot-right':{sx:K(t,[[0,0],[.25,1]]),sy:K(t,[[0,0],[.25,1]])}}),{loop:false,slots:face('face-angry')});
 return A;}
