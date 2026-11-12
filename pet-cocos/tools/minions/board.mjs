// Battle board background, portal swirl and red enemy core (paper + ink style).
import fs from 'node:fs';import sharp from 'sharp';import {Resvg} from '@resvg/resvg-js';import {catmull,d,ellipse} from './geom.mjs';
const out=process.argv[2]||'out';fs.mkdirSync(out,{recursive:true});
let seed=7;const R=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const INK='#2a1a12';
const render=(svg,w,h,file,zoom=1)=>fs.writeFileSync(file,new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${svg}</svg>`,{fitTo:{mode:'zoom',value:zoom},background:'rgba(0,0,0,0)'}).render().asPng());
const line=(p,w=3,c=INK,x='')=>`<path d="${d(p,false)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
function stone(cx,cy,w,h){const p=[[cx-w/2+R()*6,cy-h/2+R()*4],[cx+w/2-R()*6,cy-h/2+R()*5],[cx+w/2,cy+h/2-R()*5],[cx-w/2+R()*4,cy+h/2]];const top=[[p[0][0],p[0][1]],[p[1][0],p[1][1]],[p[1][0]-4,p[1][1]+h*.3],[p[0][0]+3,p[0][1]+h*.3]];
 let hatch='';for(let i=0;i<4;i++){const x=cx-w/2+8+i*(w-16)/3;hatch+=line([[x,cy+2],[x-6,cy+h/2-4]],1.6,INK,'opacity=".45"');}
 return `<path d="${d(catmull(p,true,6))}" fill="#d9d4c6" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="${d(catmull(top,true,4))}" fill="#eeeadf"/>${hatch}`;}
function tuft(x,y,s=1){let g='';for(const a of [-35,-12,8,30]){const r=a*Math.PI/180,l=(10+R()*8)*s;g+=line([[x,y],[x+Math.sin(r)*l*.6,y-l*.55],[x+Math.sin(r)*l,y-l]],2.2,INK,'opacity=".8"');}return g;}
// --- board (540x960 design, rendered at 1.5x)
let s=`<rect width="540" height="960" fill="#f7f2e4"/>`;
for(let i=0;i<900;i++)s+=`<circle cx="${(R()*540).toFixed(1)}" cy="${(R()*960).toFixed(1)}" r="${(R()*1.2+.3).toFixed(2)}" fill="#c9bfa6" opacity="${(R()*.5+.2).toFixed(2)}"/>`;
// soft ground patches (slightly darker earth) along the lane
for(let i=0;i<14;i++){const y=230+i*38,x=270+Math.sin(i*1.3)*30;s+=`<path d="${d(ellipse(x,y,150+R()*40,26+R()*12,48))}" fill="#efe6cf" opacity=".7"/>`;}
// dashed travel paths: portals -> my core
for(const [sx,sy] of [[104,262],[436,262]]){const pts=catmull([[sx,sy],[sx+(270-sx)*.2,380],[sx+(270-sx)*.55,520],[270+(sx-270)*.25,640],[270,700]],false,16);s+=line(pts,3,'#b8aa8a','stroke-dasharray="10 12" opacity=".8"');}
// rocky borders left/right + scattered stones
for(let y=140;y<820;y+=34){for(const side of [0,1]){const w=34+R()*26,h=24+R()*14,x=side?540-12-R()*22:12+R()*22;s+=stone(x,y+R()*10,w,h);if(R()<.5)s+=stone(side?x-36:x+36,y+14,22+R()*10,18+R()*6);}}
for(let i=0;i<10;i++){const x=70+R()*400,y=320+R()*380;s+=stone(x,y,14+R()*10,10+R()*6);}
for(let i=0;i<34;i++)s+=tuft(50+R()*440,170+R()*600,.8+R()*.5);
// cracks / scribbles
for(let i=0;i<10;i++){const x=80+R()*380,y=300+R()*420;s+=line([[x,y],[x+8+R()*10,y+3],[x+14+R()*10,y-2]],1.6,INK,'opacity=".35"');}
render(s,540,960,out+'/board.png',1.5);
// --- portal swirl (rotates at runtime) and eyes
// circular swirl: the game rotates it inside a node squashed to an ellipse (scaleY .62)
let sw='';for(let k=0;k<4;k++){const pts=[];for(let i=0;i<=60;i++){const t=i/60,a=k*Math.PI/2+t*Math.PI*2.4,r=8+t*82;pts.push([100+Math.cos(a)*r,100+Math.sin(a)*r]);}sw+=line(pts,10-k,k%2?'#3a3140':'#1d1820');}
render(`<circle cx="100" cy="100" r="92" fill="#2b2430"/>`+sw+`<circle cx="100" cy="100" r="92" fill="none" stroke="${INK}" stroke-width="6"/>`,200,200,out+'/portal.png',1);
const eye=(x,y)=>`<path d="${d(ellipse(x,y,10,6))}" fill="#ff3b2b"/><path d="${d(ellipse(x+2,y-1,3,2))}" fill="#ffe0d0"/>`;
render(eye(80,100)+eye(120,100)+line([[68,88],[90,96]],4,'#ff3b2b')+line([[132,88],[110,96]],4,'#ff3b2b'),200,200,out+'/portal-eyes.png',1);
// --- red core: hue-shift the cyan crystal, keep greys
const src=process.argv[3];if(src){const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<28)continue;// grey stones stay
  // cyan (low r, high g/b) -> red: swap channels and warm it
  data[i]=Math.min(255,b*1.05+20);data[i+1]=Math.round(r*.9+ (g-r)*.18);data[i+2]=Math.round(r*.85+(b-g)*.2);}
 await sharp(data,{raw:info}).resize(296,290).png().toFile(out+'/crystal-red.png');}
console.log('board ok');
