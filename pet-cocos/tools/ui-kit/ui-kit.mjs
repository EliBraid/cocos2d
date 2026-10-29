// 萌宠守卫战 · code-drawn UI kit.
// Every piece is drawn as SVG in the camp art's ink-and-paper style and rendered at 2x
// (one texture pixel = half a design pixel). Stretchable pieces carry 9-slice insets,
// written to UISkin.ts so the game sets them on load.
// usage: node ui-kit.mjs <pngOutDir> <UISkin.ts path> [contactSheet.png]
import fs from 'node:fs';import {Resvg} from '@resvg/resvg-js';
const [,,OUT='out/ui',SKIN_TS='out/UISkin.ts',SHEET]=process.argv;fs.mkdirSync(OUT,{recursive:true});
const INK='#2a1a12',PAPER='#fbf6e6',WHITE='#fffdf6';
const SKIN={};const pieces=[];
function emit(name,w,h,body,slice=null,extra={}){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
 const png=new Resvg(svg,{fitTo:{mode:'original'},background:'rgba(0,0,0,0)'}).render().asPng();fs.writeFileSync(`${OUT}/${name}.png`,png);
 SKIN[name]={w,h,...(slice?{l:slice[0],t:slice[1],r:slice[2],b:slice[3]}:{}),...extra};pieces.push({name,w,h,svg});}
// ---------------------------------------------------------------- helpers
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
// wobbly rounded rect: perimeter sampled every 3px, nudged along its normal by smooth noise
function rr(x,y,w,h,r,amp=.9){r=Math.min(r,w/2,h/2);const pts=[];const ph=[rnd()*6.28,rnd()*6.28,rnd()*6.28];
 const seg=(cx,cy,a0)=>{for(let i=0;i<=8;i++){const a=a0+i/8*Math.PI/2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}};
 const line=(x0,y0,x1,y1)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/6));for(let i=1;i<n;i++)pts.push([x0+(x1-x0)*i/n,y0+(y1-y0)*i/n]);};
 seg(x+w-r,y+r,-Math.PI/2);line(x+w,y+r,x+w,y+h-r);seg(x+w-r,y+h-r,0);line(x+w-r,y+h,x+r,y+h);seg(x+r,y+h-r,Math.PI/2);line(x,y+h-r,x,y+r);seg(x+r,y+r,Math.PI);line(x+r,y,x+w-r,y);
 const cx=x+w/2,cy=y+h/2,n=pts.length;const out=pts.map(([px,py],i)=>{const t=i/n*6.28,k=amp*(Math.sin(t*3+ph[0])*.6+Math.sin(t*7+ph[1])*.3+Math.sin(t*13+ph[2])*.1);const dx=px-cx,dy=py-cy,l=Math.hypot(dx,dy)||1;return [px+dx/l*k,py+dy/l*k];});
 return 'M'+out.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L')+' Z';}
const P=(d,fill,stroke='none',sw=0,x='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${x}/>`;
const C=(cx,cy,r,fill,stroke='none',sw=0,x='')=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${x}/>`;
const L=(pts,stroke,sw,x='')=>`<path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
const SHADOW='rgba(42,26,18,.22)';
// ---------------------------------------------------------------- buttons (normal + pressed)
// face/lip/gloss colour sets; all buttons share one silhouette so text sits the same on all.
const BTN={red:['#f46f5e','#c4473b','#ffb3a6'],cream:[PAPER,'#d8cca8','#ffffff'],green:['#86d36f','#4f9a45','#c8f2b8'],gold:['#ffc93f','#d4951a','#fff0b0'],blue:['#62c6e8','#2f8fb8','#bff0fb'],grey:['#dcd9cb','#aeaa96','#f1efe6']};
const BW=132,BH=112,LIP=12;
for(const [k,[face,lip,gloss]] of Object.entries(BTN)){
 for(const down of [false,true]){seed=11;const top=down?9:3,bot=down?BH-3:BH-9,lipH=down?4:LIP;
  let s='';if(!down)s+=P(rr(3,9,BW-6,BH-12,28),SHADOW);
  s+=P(rr(3,top,BW-6,bot-top,28),lip);s+=P(rr(3,top,BW-6,bot-top-lipH,28,.6),face);
  s+=L([[30,top+11],[BW-30,top+11]],gloss,5,'opacity=".85"')+C(19,top+19,3,gloss,'none',0,'opacity=".85"');
  s+=P(rr(3,top,BW-6,bot-top,28),'none',INK,5);
  emit(`btn-${k}${down?'-down':''}`,BW,BH,s,[40,34,40,40],{faceTop:top,faceBottom:BH-(bot-lipH)});}}
// ---------------------------------------------------------------- panels & cards
{seed=21;let s=P(rr(5,12,150,144,24),SHADOW)+P(rr(4,4,150,148,24),PAPER,INK,5)+P(rr(15,15,128,126,15,.4),'none','#dccfa9',2.5);
 // stitched corners + a little hatching, kept inside the 48px insets so slicing never stretches them
 for(const [x,y,sx,sy] of [[22,22,1,1],[138,22,-1,1],[22,134,1,-1],[138,134,-1,-1]])s+=L([[x,y+sy*12],[x,y],[x+sx*12,y]],INK,3,'opacity=".55"');
 for(let i=0;i<4;i++)s+=L([[118+i*7,146],[128+i*7,136]],INK,2,'opacity=".18"');
 emit('panel',160,160,s,[48,48,48,48]);}
{seed=23;let s=P(rr(3,8,90,86,18),'#e6ddc3')+P(rr(3,3,90,84,18),WHITE)+P(rr(3,3,90,91,18),'none',INK,4);emit('card',96,96,s,[30,30,30,32]);}
{seed=24;let s=P(rr(3,8,90,86,18),'#e9c46a')+P(rr(3,3,90,84,18),'#fff4d2')+P(rr(3,3,90,91,18),'none',INK,4)+P(rr(9,9,78,72,13,.3),'none','#f2c14e',3);emit('card-gold',96,96,s,[30,30,30,32]);}
{seed=25;let s=P(rr(3,3,90,90,18),'rgba(42,26,18,.08)')+P(rr(3,3,90,90,18),'none','#b9b09a',3,'stroke-dasharray="9 7"');emit('card-empty',96,96,s,[30,30,30,30]);}
// ---------------------------------------------------------------- title ribbon (horizontal stretch only)
{seed=31;const red='#f46f5e',dark='#b8402f';let s='';
 for(const f of [1,-1]){const x0=f>0?6:394,x1=f>0?70:330;s+=P(`M${x0} 34 L${x1} 34 L${x1} 94 L${x0} 94 L${x0+f*18} 64 Z`,dark,INK,5);s+=P(`M${x1} 80 L${x1-f*-0} 94 L${x1+f*16} 80 Z`,'#7a2a20',INK,4);}
 s+=P(rr(54,14,292,66,8,.5),red,INK,5)+L([[66,26],[334,26]],'#ffb3a6',4,'opacity=".8"')+L([[62,70],[338,70]],dark,3,'opacity=".6"');
 emit('ribbon',400,100,s,[100,0,100,0]);}
// ---------------------------------------------------------------- pill counter, progress bar
{seed=41;let s=P(rr(3,3,106,58,28),WHITE,INK,4)+P(rr(9,8,94,14,7,.2),'#efe7cf');emit('pill',112,64,s,[32,30,32,30]);}
{seed=42;let s=P(rr(2,2,56,24,12,.3),'#e3d8bb',INK,3.5)+L([[12,8.5],[48,8.5]],'#c4b48e',3.5);emit('bar-bg',60,28,s,[14,13,14,13]);}
for(const [k,c,hi] of [['cyan','#4cd5dc','#b6f3f5'],['green','#7ed36a','#d0f5c2'],['red','#f46f5e','#ffc2b8'],['gold','#ffc93f','#fff1b8']]){
 emit(`bar-${k}`,40,20,`<rect x="0" y="0" width="40" height="20" rx="10" fill="${c}"/><rect x="6" y="4" width="28" height="5" rx="2.5" fill="${hi}" opacity=".9"/>`,[10,9,10,9]);}
// ---------------------------------------------------------------- round buttons
function roundBtn(name,size,face,lip,glyph){const r=size/2-5,cx=size/2,cy=size/2-2;let s=C(cx,cy+8,r,SHADOW)+C(cx,cy+6,r,lip,INK,5)+C(cx,cy,r,face,INK,5)+C(cx,cy+6,r-2.5,lip)+C(cx,cy,r-2.5,face)+P(`M${cx-r*.55} ${cy-r*.45} A${r*.75} ${r*.75} 0 0 1 ${cx+r*.1} ${cy-r*.75}`,'none','#ffffff',4,'opacity=".75"');
 emit(name,size,size+8,s+glyph(cx,cy,r),null,{faceDy:-2});}
roundBtn('round',104,PAPER,'#d8cca8',()=>'');
roundBtn('close',72,'#f46f5e','#c4473b',(x,y)=>L([[x-10,y-10],[x+10,y+10]],INK,11)+L([[x+10,y-10],[x-10,y+10]],INK,11)+L([[x-10,y-10],[x+10,y+10]],'#fff',6)+L([[x+10,y-10],[x-10,y+10]],'#fff',6));
roundBtn('plus',48,'#86d36f','#4f9a45',(x,y)=>L([[x-7,y],[x+7,y]],INK,9)+L([[x,y-7],[x,y+7]],INK,9)+L([[x-7,y],[x+7,y]],'#fff',4.5)+L([[x,y-7],[x,y+7]],'#fff',4.5));
emit('dot',32,32,C(16,16,11,'#e8402f',INK,3)+C(13,12,3,'#ffb3a6'));
// ---------------------------------------------------------------- avatar ring & pet slots by rarity
emit('avatar-ring',156,156,C(78,82,72,SHADOW)+C(78,78,72,PAPER,INK,5)+C(78,78,61,'#e2f6f6','#4cd5dc',9)+C(78,78,66,'none',INK,2.5,'opacity=".5"'));
const RARITY={common:['#bdb9a8','#f3f1e8'],fine:['#79c36a','#eaf8e2'],rare:['#59a8e8','#e3f1fd'],epic:['#b07ce0','#f3e9fc'],legend:['#f5a623','#fff1d6']};
for(const [k,[band,bg]] of Object.entries(RARITY)){seed=51;const out=rr(3,3,130,140,20);let s=`<clipPath id="c"><path d="${out}"/></clipPath>`+P(rr(3,10,130,138,20),SHADOW)+P(out,bg)+`<rect x="0" y="104" width="136" height="48" fill="${band}" clip-path="url(#c)"/>`;
 s+=P(out,'none',INK,5)+P(rr(11,11,114,124,13,.3),'none',band,5,'opacity=".9"')+L([[10,104],[126,104]],INK,3,'opacity=".6"');
 s+=P('M20 9 L29 18 L20 27 L11 18 Z',band,INK,3);
 emit(`slot-${k}`,136,152,s,[40,40,40,52]);}
// ---------------------------------------------------------------- stars
const star=(cx,cy,R,r)=>{const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r:R;p.push([cx+Math.cos(a)*q,cy+Math.sin(a)*q]);}return 'M'+p.map(v=>v[0].toFixed(1)+' '+v[1].toFixed(1)).join(' L')+' Z';};
emit('star',60,60,P(star(30,32,26,12),'#ffc93f',INK,4.5)+P(star(30,32,13,6),'#fff1b8','none',0,'opacity=".7" transform="translate(-4 -4)"'));
emit('star-off',60,60,P(star(30,32,26,12),'#d8d3c2',INK,4.5,'opacity=".9"'));
// ---------------------------------------------------------------- icons (96x96, coloured doodles)
const ICON={};const I=(name,body)=>{ICON[name]=body;emit('icon-'+name,96,96,body);};
const shade='opacity=".35"';
I('coin',C(48,52,34,'#d4951a',INK,5)+C(48,48,34,'#ffc93f',INK,5)+C(48,48,23,'none','#d4951a',4)+P(star(48,49,14,6.5),'#e0a21c','none')+P('M24 40 A26 26 0 0 1 38 22','none','#fff4c0',5));
I('diamond',P('M18 38 L32 20 L64 20 L78 38 L48 80 Z','#62c6e8',INK,5)+P('M18 38 L78 38 M32 20 L40 38 L48 80 M64 20 L56 38 L48 80','none',INK,3)+P('M32 20 L40 38 L18 38 Z','#c4f1fb')+P('M56 38 L78 38 L48 80 Z','#2f8fb8',  'none',0,shade));
I('food',P('M48 30 C30 18 12 30 16 52 C20 76 38 86 48 80 C58 86 76 76 80 52 C84 30 66 18 48 30 Z','#f46f5e',INK,5)+P('M48 30 C47 22 50 14 56 10','none',INK,5)+P('M52 22 C60 10 76 12 78 18 C68 26 58 26 52 22 Z','#86d36f',INK,4)+P('M26 44 C26 38 30 34 34 33','none','#ffc2b8',5));
I('energy',P('M56 8 L22 54 L44 54 L36 88 L74 38 L52 38 Z','#86d36f',INK,5)+P('M52 18 L32 48','none','#d0f5c2',4));
I('mail',P(rr(10,22,76,54,8),'#fbf6e6',INK,5)+P('M14 26 L48 54 L82 26','none',INK,4.5)+C(48,56,10,'#f46f5e',INK,4)+P('M44 55 L48 59 L53 52','none','#fff',3));
I('task',P(rr(18,14,60,72,8),'#b9824e',INK,5)+P(rr(25,24,46,56,4),'#fffdf6',INK,3.5)+P(rr(36,8,24,14,4),'#9aa3ad',INK,4)+L([[31,40],[36,45],[44,35]],'#4f9a45',4.5)+L([[50,41],[64,41]],INK,3.5)+L([[31,58],[36,63],[44,53]],'#4f9a45',4.5)+L([[50,59],[64,59]],INK,3.5));
I('book',P('M8 24 C22 18 36 18 48 26 L48 82 C36 74 22 74 8 80 Z','#fbf6e6',INK,5)+P('M88 24 C74 18 60 18 48 26 L48 82 C60 74 74 74 88 80 Z','#fbf6e6',INK,5)+P('M8 80 C22 74 36 74 48 82 C60 74 74 74 88 80 L88 86 C74 80 60 82 48 88 C36 82 22 80 8 86 Z','#59a8e8',INK,4)+L([[16,36],[38,34]],'#c9bd9a',3)+L([[16,48],[38,46]],'#c9bd9a',3)+L([[58,34],[80,36]],'#c9bd9a',3)+C(69,52,7,'#f46f5e',INK,3));
{let g='';for(let i=0;i<8;i++){const a=i*Math.PI/4;g+=`<rect x="41" y="8" width="14" height="18" rx="3" fill="#9aa9b8" stroke="${INK}" stroke-width="4" transform="rotate(${i*45} 48 48)"/>`;}I('gear',g+C(48,48,26,'#9aa9b8',INK,5)+C(48,48,10,'#fbf6e6',INK,4)+P('M30 40 A20 20 0 0 1 42 28','none','#d8e1ea',4));}
I('home',P('M14 46 L48 16 L82 46 Z','#f46f5e',INK,5)+P(rr(22,44,52,40,4),'#fbf6e6',INK,5)+P(rr(40,58,16,26,3),'#b9824e',INK,4)+P(rr(60,22,10,16,2),'#9aa3ad',INK,4));
I('paw',P('M48 48 C30 48 22 66 30 76 C38 84 58 84 66 76 C74 66 66 48 48 48 Z','#ff9a4a',INK,5)+[[22,38,9,12,-20],[38,24,9,12,-5],[58,24,9,12,5],[74,38,9,12,20]].map(([x,y,rx,ry,a])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#ff9a4a" stroke="${INK}" stroke-width="4.5"/>`).join(''));
I('team',P('M8 86 C8 64 20 56 32 56 C44 56 56 64 56 86 Z','#62c6e8',INK,5)+C(32,38,15,'#fbf6e6',INK,5)+P('M40 86 C40 64 52 56 64 56 C76 56 88 64 88 86 Z','#f46f5e',INK,5)+C(64,38,15,'#fbf6e6',INK,5));
I('bag',P(rr(18,26,60,60,14),'#c8955e',INK,5)+P('M32 28 C32 10 64 10 64 28','none',INK,5)+P(rr(18,26,60,26,12),'#a8743e',INK,5)+P(rr(40,44,16,14,3),'#ffc93f',INK,4)+P(rr(26,62,44,16,5),'#dcae78',INK,3.5));
I('compass',C(48,50,36,'#d4951a',INK,5)+C(48,48,30,'#fbf6e6',INK,4)+P('M48 22 L57 48 L48 52 L39 48 Z','#f46f5e',INK,3.5)+P('M48 74 L57 48 L48 44 L39 48 Z','#9aa9b8',INK,3.5)+C(48,48,4,INK));
const sword=r=>`<g transform="rotate(${r} 48 48)"><path d="M43 8 L48 2 L53 8 L53 58 L43 58 Z" fill="#e6eaf0" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><path d="M48 8 L48 54" stroke="#ffffff" stroke-width="3"/><rect x="32" y="56" width="32" height="9" rx="4" fill="#ffc93f" stroke="${INK}" stroke-width="4.5"/><rect x="44" y="64" width="8" height="18" fill="#8a5a32" stroke="${INK}" stroke-width="4"/><circle cx="48" cy="86" r="6" fill="#ffc93f" stroke="${INK}" stroke-width="4"/></g>`;
I('swords',sword(-40)+sword(40));
I('lock',P('M32 44 L32 30 C32 12 64 12 64 30 L64 44','none',INK,13)+P('M32 44 L32 30 C32 12 64 12 64 30 L64 44','none','#9aa9b8',6)+P(rr(20,42,56,44,10),'#ffc93f',INK,5)+C(48,60,6,INK)+P('M46 62 L44 74 L52 74 L50 62 Z',INK));
I('star',P(star(48,52,38,17),'#ffc93f',INK,5)+P(star(44,46,16,7),'#fff1b8','none',0,'opacity=".7"'));
I('egg',`<ellipse cx="48" cy="54" rx="30" ry="36" fill="#fbf6e6" stroke="${INK}" stroke-width="5"/>`+C(36,44,6,'#86d36f',INK,3)+C(58,36,4,'#86d36f',INK,3)+C(60,62,7,'#86d36f',INK,3)+C(40,70,4,'#86d36f',INK,3)+P('M28 40 C30 30 36 22 42 20','none','#ffffff',5));
I('fruit',P('M48 26 C26 22 16 44 20 62 C24 80 40 88 48 84 C56 88 72 80 76 62 C80 44 70 22 48 26 Z','#b07ce0',INK,5)+P('M48 26 L50 12','none',INK,5)+P('M50 18 C58 6 74 8 76 14 C66 22 56 22 50 18 Z','#86d36f',INK,4)+P('M30 46 C30 40 34 36 38 35','none','#e8d4fb',5)+P(star(66,70,9,4),'#fff1b8',INK,2.5));
I('shard',P('M48 6 L72 34 L60 88 L36 88 L24 34 Z','#b07ce0',INK,5)+P('M48 6 L48 88 M24 34 L48 46 L72 34','none',INK,3)+P('M48 6 L24 34 L48 46 Z','#e8d4fb'));
I('chest',P(rr(12,40,72,44,6),'#c8955e',INK,5)+P('M12 44 C12 20 84 20 84 44 Z','#a8743e',INK,5)+P(rr(12,40,72,10,3),'#ffc93f',INK,4)+P(rr(40,44,16,18,4),'#ffc93f',INK,4)+C(48,54,3,INK)+L([[30,26],[30,84]],INK,3,'opacity=".5"')+L([[66,26],[66,84]],INK,3,'opacity=".5"'));
I('trophy',P('M28 14 L68 14 L66 44 C64 58 32 58 30 44 Z','#ffc93f',INK,5)+P('M28 20 C10 20 12 44 30 42 M68 20 C86 20 84 44 66 42','none',INK,5)+P(rr(42,56,12,14,2),'#d4951a',INK,4)+P(rr(28,68,40,16,4),'#8a5a32',INK,5)+P('M38 22 L36 40','none','#fff1b8',5));
I('heart',P('M48 82 C14 58 10 34 26 24 C36 18 46 24 48 32 C50 24 60 18 70 24 C86 34 82 58 48 82 Z','#f46f5e',INK,5)+P('M24 36 C24 30 28 28 32 28','none','#ffc2b8',5));
I('shield',P('M48 8 L80 20 C80 52 70 74 48 88 C26 74 16 52 16 20 Z','#9aa9b8',INK,5)+P('M48 18 L70 27 C70 52 62 68 48 78 C34 68 26 52 26 27 Z','#fbf6e6',INK,3.5)+`<ellipse cx="48" cy="56" rx="10" ry="8" fill="${INK}"/>`+[[36,44],[44,38],[52,38],[60,44]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="4" ry="5" fill="${INK}"/>`).join(''));
I('hammer',`<g transform="rotate(-35 48 48)"><rect x="43" y="34" width="10" height="56" rx="4" fill="#c8955e" stroke="${INK}" stroke-width="4.5"/><rect x="22" y="14" width="52" height="24" rx="5" fill="#9aa9b8" stroke="${INK}" stroke-width="5"/><path d="M28 20 L66 20" stroke="#d8e1ea" stroke-width="4"/></g>`);
I('target',C(48,48,36,'#fbf6e6',INK,5)+C(48,48,26,'#f46f5e',INK,4)+C(48,48,16,'#fbf6e6',INK,4)+C(48,48,7,'#f46f5e',INK,4));
I('back',L([[60,18],[30,48],[60,78]],INK,13)+L([[60,18],[30,48],[60,78]],'#fbf6e6',6));
I('pencil',`<g transform="rotate(45 48 48)"><rect x="38" y="10" width="20" height="60" rx="3" fill="#ffc93f" stroke="${INK}" stroke-width="4.5"/><path d="M38 70 L48 90 L58 70 Z" fill="#f3d9b1" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><rect x="38" y="10" width="20" height="12" rx="3" fill="#f46f5e" stroke="${INK}" stroke-width="4.5"/></g>`);
I('check',L([[20,50],[40,70],[78,26]],INK,15)+L([[20,50],[40,70],[78,26]],'#86d36f',8));
// ---------------------------------------------------------------- outputs
const ts=`// Generated by tools/ui-kit/ui-kit.mjs — do not edit by hand.
// Texture size in texture pixels (2x design pixels) and 9-slice insets (l,t,r,b) where the piece stretches.
export type SkinPiece={w:number;h:number;l?:number;t?:number;r?:number;b?:number;faceTop?:number;faceBottom?:number;faceDy?:number};
export const UI_SKIN:Record<string,SkinPiece>=${JSON.stringify(SKIN,null,0).replace(/\},"/g,'},\n "')};
export const UI_SKIN_DIR='ui/';
`;
fs.writeFileSync(SKIN_TS,ts);console.log(pieces.length,'pieces');
if(SHEET){const cols=8,cw=170,ch=180,rows=Math.ceil(pieces.length/cols);let s=`<rect width="${cols*cw}" height="${rows*ch}" fill="#efe6cf"/>`;
 pieces.forEach((p,i)=>{const x=(i%cols)*cw,y=Math.floor(i/cols)*ch,k=Math.min(1,150/p.w,140/p.h);s+=`<g transform="translate(${x+(cw-p.w*k)/2} ${y+10+(140-p.h*k)/2}) scale(${k})">${p.svg.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g><text x="${x+cw/2}" y="${y+170}" font-size="14" text-anchor="middle" font-family="sans-serif" fill="#555">${p.name}</text>`;});
 fs.writeFileSync(SHEET,new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cw}" height="${rows*ch}">${s}</svg>`,{font:{loadSystemFonts:true}}).render().asPng());}
